#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# MEICENTO Claude Code Statusline v2.1
# Pure bash + jq — native cost, TPM, dot-matrix context bar
# ═══════════════════════════════════════════════════════════════════════════
#
# Features:
#   ✦ Context bar with 6-tier color (◖◗ half-circle dots)
#   ✦ Native cost from Claude Code (cost.total_cost_usd) + burn rate ($/h)
#   ✦ TPM (tokens per minute) throughput
#   ✦ Token counting: input / output / cache_write / cache_read
#   ✦ Fallback cost calculation when native cost unavailable
#   ✦ API mode detection — hides rate limits for API keys
#   ✦ Team mode indicator
#   ✦ Git branch + dirty state
#   ✦ Tool / agent / skill call counts from transcript
#   ✦ Todo progress tracking
#
# Input:  JSON on stdin from Claude Code
# Output: 1–3 lines of ANSI-colored status text

# Fail silently — statusline must never produce visible errors
exec 2>/dev/null

# Force consistent decimal handling across locales
export LC_NUMERIC=C

# ═══════════════════════════════════════════════════════════════════════════
# ENVIRONMENT DETECTION (must be BEFORE stdin parsing)
# ═══════════════════════════════════════════════════════════════════════════

# Non-subscription (API key) mode: ALL rate-limit / reset-time code is PROHIBITED.
# Detection: ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY in env means pay-per-token,
# not OAuth subscription — so usage quotas and reset windows do not apply.
is_api=0
[ -n "${ANTHROPIC_AUTH_TOKEN:-}" ] || [ -n "${ANTHROPIC_API_KEY:-}" ] && is_api=1

# Team mode
is_team=0
[ "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-}" = "1" ] && is_team=1

# ═══════════════════════════════════════════════════════════════════════════
# COLORS
# ═══════════════════════════════════════════════════════════════════════════

RST=$'\033[0m'
DIM=$'\033[2m'
BOLD=$'\033[1m'
CYAN=$'\033[36m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
RED=$'\033[31m'
MAGENTA=$'\033[35m'
ORANGE=$'\033[38;5;208m'
BWHITE=$'\033[97m'
BOLD_RED=$'\033[1;31m'
BOLD_RRED=$'\033[1;7;31m'

# ═══════════════════════════════════════════════════════════════════════════
# CACHE
# ═══════════════════════════════════════════════════════════════════════════

CACHE_DIR="${HOME}/.cache/meicento-hud"
mkdir -p "$CACHE_DIR" 2>/dev/null

# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════

sep() { printf " ${DIM}│${RST} "; }

# Format token value: always with unit  1234567→1.2M  12345→12K  328→0.3K  0→0
fv() {
  local n=${1:-0}
  if [ "$n" -ge 950000 ] 2>/dev/null; then
    awk "BEGIN{printf \"%.1fM\",$n/1000000}"
  elif [ "$n" -ge 10000 ] 2>/dev/null; then
    printf '%dK' "$(( n / 1000 ))"
  elif [ "$n" -ge 100 ] 2>/dev/null; then
    awk "BEGIN{printf \"%.1fK\",$n/1000}"
  elif [ "$n" -gt 0 ] 2>/dev/null; then
    printf '%d' "$n"
  else
    printf '0'
  fi
}

# 3-tier color by percentage
cpct() {
  local p=${1:-0}
  if [ "$p" -gt 80 ] 2>/dev/null; then printf '%s' "$RED"
  elif [ "$p" -gt 50 ] 2>/dev/null; then printf '%s' "$YELLOW"
  else printf '%s' "$GREEN"; fi
}

# 6-tier color for CHEN MI bar
c6() {
  local p=${1:-0}
  if   [ "$p" -ge 80 ] 2>/dev/null; then printf '%s' "$BOLD_RRED"
  elif [ "$p" -ge 60 ] 2>/dev/null; then printf '%s' "$BOLD_RED"
  elif [ "$p" -ge 40 ] 2>/dev/null; then printf '%s' "$RED"
  elif [ "$p" -ge 20 ] 2>/dev/null; then printf '%s' "$ORANGE"
  elif [ "$p" -ge 15 ] 2>/dev/null; then printf '%s' "$YELLOW"
  else printf '%s' "$GREEN"; fi
}

# Color for cost value
ccost() {
  local v="$1"
  if awk "BEGIN{exit !($v > 5)}" 2>/dev/null; then printf '%s' "$RED"
  elif awk "BEGIN{exit !($v > 1)}" 2>/dev/null; then printf '%s' "$YELLOW"
  else printf '%s' "$GREEN"; fi
}

# Short model name: claude-opus-4-6 → Opus 4.6
smodel() {
  local id="$1" display="$2"
  if [[ "$id" =~ claude-([a-z]+)-([0-9]+)-([0-9]+) ]]; then
    local tier="${BASH_REMATCH[1]}" major="${BASH_REMATCH[2]}" minor="${BASH_REMATCH[3]}"
    local first; first=$(printf '%s' "${tier:0:1}" | tr '[:lower:]' '[:upper:]')
    tier="${first}${tier:1}"
    if [ "$minor" -ge 2025 ] 2>/dev/null; then printf '%s %s' "$tier" "$major"
    else printf '%s %s.%s' "$tier" "$major" "$minor"; fi
  elif [[ "$id" =~ claude-([a-z]+)-([0-9]+) ]]; then
    local tier="${BASH_REMATCH[1]}"
    local first; first=$(printf '%s' "${tier:0:1}" | tr '[:lower:]' '[:upper:]')
    tier="${first}${tier:1}"
    printf '%s %s' "$tier" "${BASH_REMATCH[2]}"
  else
    printf '%s' "$display"
  fi
}

# Format reset time: ISO8601 → "2h15m" or "4d19h"
# GUARD: never runs in non-subscription (API) mode — defense-in-depth
fmt_reset() {
  [ "$is_api" = 1 ] && return 1
  local ts="$1"
  [ -z "$ts" ] && return 1
  local now clean reset_epoch
  now=$(date +%s)
  clean="${ts%%[.+]*}"; clean="${clean%Z}"
  reset_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$clean" +%s 2>/dev/null \
    || date -d "$ts" +%s 2>/dev/null) || return 1
  [ -z "$reset_epoch" ] && return 1
  local diff=$(( reset_epoch - now ))
  [ "$diff" -le 0 ] && return 1
  local m=$(( diff / 60 )) h=$(( m / 60 )) d=$(( h / 24 ))
  if [ "$d" -gt 0 ]; then printf '%dd%dh' "$d" $((h%24))
  else printf '%dh%dm' "$h" $((m%60)); fi
}

# ═══════════════════════════════════════════════════════════════════════════
# READ STDIN (single jq call)
# ═══════════════════════════════════════════════════════════════════════════

input=$(cat)
[ -z "$input" ] && exit 0

# Defaults
model_display="Claude" model_id="" ctx_pct_raw="" ctx_input=0 ctx_output=0
duration="" mcp_count=0 transcript_path="" rl_5h="" rl_wk="" rl_wk_reset="" work_dir=""
cost_usd="" cost_duration_ms=""

eval "$(jq -r '
  "model_display=" + ((.model.display_name // "Claude") | @sh),
  "model_id="      + ((.model.id // "") | @sh),
  "ctx_pct_raw="   + (if .context_window.used_percentage != null then (.context_window.used_percentage | tostring) else "" end | @sh),
  "ctx_input="     + ((.context_window.total_input_tokens // 0) | tostring),
  "ctx_output="    + ((.context_window.total_output_tokens // 0) | tostring),
  "duration="      + ((.duration // "") | @sh),
  "mcp_count="     + ((.mcp.servers_count // 0) | tostring),
  "transcript_path=" + ((.transcript_path // "") | @sh),
  "rl_5h="         + (if .rate_limits.five_hour_percent != null then (.rate_limits.five_hour_percent | tostring) else "" end | @sh),
  "rl_wk="         + (if .rate_limits.weekly_percent != null then (.rate_limits.weekly_percent | tostring) else "" end | @sh),
  "rl_wk_reset="   + ((.rate_limits.weekly_resets_at // "") | @sh),
  "work_dir="      + ((.workspace.current_dir // .cwd // "") | @sh),
  "cost_usd="      + (if .cost.total_cost_usd != null then (.cost.total_cost_usd | tostring) else "" end | @sh),
  "cost_duration_ms=" + (if .cost.total_duration_ms != null then (.cost.total_duration_ms | tostring) else "" end | @sh)
' <<< "$input")" 2>/dev/null || true

# Normalize context percentage (handle both 0–1 and 0–100 ranges)
ctx_pct=0
if [ -n "$ctx_pct_raw" ]; then
  ctx_pct=$(awk "BEGIN{v=$ctx_pct_raw; if(v>0 && v<=1) v=v*100; printf \"%.0f\",v}")
fi

# ═══════════════════════════════════════════════════════════════════════════
# NON-SUBSCRIPTION GUARD: force-clear rate-limit data in API mode
# Even if stdin JSON contains these fields, they are meaningless for API keys.
# This ensures fmt_reset / cpct for usage can NEVER execute in API mode.
# ═══════════════════════════════════════════════════════════════════════════

if [ "$is_api" = 1 ]; then
  rl_5h="" rl_wk="" rl_wk_reset=""
fi

# ═══════════════════════════════════════════════════════════════════════════
# GIT INFO
# ═══════════════════════════════════════════════════════════════════════════

git_branch="" git_dirty=""
if [ -n "$work_dir" ] && [ -d "$work_dir" ]; then
  git_branch=$(git -C "$work_dir" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null || true)
  if [ -n "$git_branch" ]; then
    git -C "$work_dir" --no-optional-locks diff --quiet HEAD 2>/dev/null || git_dirty="*"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# TRANSCRIPT PARSING (with file-size cache)
# ═══════════════════════════════════════════════════════════════════════════

t_ti=0 t_to=0 t_cw=0 t_cr=0  # session token totals
t_li=0 t_lo=0 t_lr=0          # last request tokens
t_tc=0 t_ac=0 t_sc=0          # tool/agent/skill counts
t_td=0 t_tt=0                 # todos done/total
has_transcript=0

if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
  _tc_sz="${CACHE_DIR}/tc.sz"
  _tc_dat="${CACHE_DIR}/tc.dat"
  _fsize=$(wc -c < "$transcript_path" | tr -d ' ')
  _use_cache=0

  if [ -f "$_tc_sz" ] && [ -f "$_tc_dat" ]; then
    _cached_sz=$(cat "$_tc_sz" 2>/dev/null)
    [ "$_cached_sz" = "$_fsize" ] && _use_cache=1
  fi

  if [ "$_use_cache" = 1 ]; then
    _tdata=$(cat "$_tc_dat")
  else
    _tdata=$(tail -c 524288 "$transcript_path" | grep -a '^{' | jq -s '
      [.[] | select(.message != null)] |
      [.[].message.usage // empty] as $u |
      {
        ti: ([$u[].input_tokens // 0] | add // 0),
        to: ([$u[].output_tokens // 0] | add // 0),
        cw: ([$u[].cache_creation_input_tokens // 0] | add // 0),
        cr: ([$u[].cache_read_input_tokens // 0] | add // 0),
        li: ($u | if length > 0 then last.input_tokens // 0 else 0 end),
        lo: ($u | if length > 0 then last.output_tokens // 0 else 0 end),
        lr: ($u | if length > 0 then last.reasoning_tokens // 0 else 0 end),
        tc: [.[].message.content[]? | select(.type == "tool_use")] | length,
        ac: [.[].message.content[]? | select(.type == "tool_use" and (.name == "Task" or .name == "proxy_Task"))] | length,
        sc: [.[].message.content[]? | select(.type == "tool_use" and (.name == "Skill" or .name == "proxy_Skill"))] | length,
        tt: ([.[].message.content[]? | select(.type == "tool_use" and .name == "TodoWrite") | .input.todos] | if length > 0 then last | length else 0 end),
        td: ([.[].message.content[]? | select(.type == "tool_use" and .name == "TodoWrite") | .input.todos] | if length > 0 then last | [.[] | select(.status == "completed")] | length else 0 end)
      }
    ' 2>/dev/null)

    if [ -n "$_tdata" ] && [ "$_tdata" != "null" ]; then
      printf '%s' "$_fsize" > "$_tc_sz"
      printf '%s' "$_tdata" > "$_tc_dat"
    fi
  fi

  if [ -n "$_tdata" ] && [ "$_tdata" != "null" ]; then
    has_transcript=1
    IFS=$'\t' read -r t_ti t_to t_cw t_cr t_li t_lo t_lr t_tc t_ac t_sc t_tt t_td <<< \
      "$(printf '%s' "$_tdata" | jq -r '[.ti,.to,.cw,.cr,.li,.lo,.lr,.tc,.ac,.sc,.tt,.td] | @tsv')"
    # Ensure numeric defaults
    : "${t_ti:=0}" "${t_to:=0}" "${t_cw:=0}" "${t_cr:=0}"
    : "${t_li:=0}" "${t_lo:=0}" "${t_lr:=0}"
    : "${t_tc:=0}" "${t_ac:=0}" "${t_sc:=0}" "${t_tt:=0}" "${t_td:=0}"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# COST + TOKEN TOTALS
# ═══════════════════════════════════════════════════════════════════════════

session_cost="" cost_raw=0 cost_per_hour="" tok_total=0 tok_per_min=""

# Token totals: prefer context_window fields (always available), enrich with transcript
tok_total=$(( ctx_input + ctx_output ))
if [ "$has_transcript" = 1 ] && [ "$(( t_ti + t_to ))" -gt "$tok_total" ]; then
  tok_total=$(( t_ti + t_to + t_cw + t_cr ))
fi

# Cost: prefer native cost.total_cost_usd from Claude Code, fallback to manual calc
if [ -n "$cost_usd" ]; then
  cost_raw="$cost_usd"
  session_cost=$(awk "BEGIN{
    c=$cost_usd
    if(c>=10)     printf \"\$%.1f\",c
    else if(c>=1) printf \"\$%.2f\",c
    else if(c>0)  printf \"\$%.3f\",c
    else          printf \"\$0.00\"
  }")
  # Burn rate: $/hour
  if [ -n "$cost_duration_ms" ] && awk "BEGIN{exit !($cost_duration_ms > 0)}" 2>/dev/null; then
    cost_per_hour=$(awk "BEGIN{printf \"%.2f\", $cost_usd * 3600000 / $cost_duration_ms}")
  fi
elif [ "$has_transcript" = 1 ] && [ "$(( t_ti + t_to ))" -gt 0 ]; then
  # Fallback: manual calculation from transcript tokens
  case "$model_id" in
    *opus*)   _ip=15;   _op=75;   _cwp=18.75; _crp=1.50  ;;
    *sonnet*) _ip=3;    _op=15;   _cwp=3.75;  _crp=0.30  ;;
    *haiku*)  _ip=0.80; _op=4;    _cwp=1.00;  _crp=0.08  ;;
    *)        _ip=3;    _op=15;   _cwp=3.75;  _crp=0.30  ;;
  esac
  cost_raw=$(awk "BEGIN{printf \"%.6f\",($t_ti*$_ip+$t_to*$_op+$t_cw*$_cwp+$t_cr*$_crp)/1000000}")
  session_cost=$(awk "BEGIN{
    c=$cost_raw
    if(c>=10)     printf \"\$%.1f\",c
    else if(c>=1) printf \"\$%.2f\",c
    else if(c>0)  printf \"\$%.3f\",c
    else          printf \"\$0.00\"
  }")
fi

# TPM: tokens per minute from cost.total_duration_ms
if [ "$tok_total" -gt 0 ] 2>/dev/null && [ -n "$cost_duration_ms" ] && \
   awk "BEGIN{exit !($cost_duration_ms > 0)}" 2>/dev/null; then
  tok_per_min=$(awk "BEGIN{printf \"%.0f\", $tok_total * 60000 / $cost_duration_ms}")
fi

# ═══════════════════════════════════════════════════════════════════════════
# CONTEXT BAR: half-circle dots ◖◗, 10 cells (5 pairs, half-step precision)
# ═══════════════════════════════════════════════════════════════════════════

render_bar() {
  local pct=${1:-0}
  local WIDTH=10
  local filled; filled=$(awk "BEGIN{printf \"%d\", $pct / 100 * $WIDTH + 0.5}")

  local bar_color; bar_color=$(c6 "$pct")
  local result=""

  local i
  for (( i=0; i<WIDTH; i++ )); do
    if (( i % 2 == 0 )); then
      if (( i < filled )); then result+="${bar_color}◖${RST}"
      else result+="${DIM}◌${RST}"; fi
    else
      if (( i < filled )); then result+="${bar_color}◗${RST}"
      else result+="${DIM}◌${RST}"; fi
    fi
  done

  printf '%s' "$result"
}

# ═══════════════════════════════════════════════════════════════════════════
# LINE 1: SESSION & METRICS
# ═══════════════════════════════════════════════════════════════════════════

L1=()

# Model
_mname=$(smodel "$model_id" "$model_display")
L1+=("${CYAN}${_mname}${RST}")

# CHEN MI context bar + percentage
if [ -n "$ctx_pct_raw" ]; then
  _bar=$(render_bar "$ctx_pct")
  _pc=$(c6 "$ctx_pct")
  L1+=("${_bar} ${_pc}${ctx_pct}%${RST}")
fi

# Tokens: context window totals (native from Claude Code)
_tok="in:$(fv "$ctx_input")/out:$(fv "$ctx_output")"
L1+=("$_tok")

# Rate limits — completely invisible in API mode (no indicator, no data)
if [ "$is_api" != 1 ]; then
  if [ -n "$rl_5h" ]; then
    _fh=$(printf '%.0f' "$rl_5h" 2>/dev/null)
    _fc=$(cpct "$_fh")
    _rl="${_fc}5h:${_fh}%${RST}"

    if [ -n "$rl_wk" ]; then
      _wk=$(printf '%.0f' "$rl_wk" 2>/dev/null)
      _wc=$(cpct "$_wk")
      _rl+=" ${_wc}7d:${_wk}%${RST}"
      _wr=$(fmt_reset "$rl_wk_reset" 2>/dev/null)
      [ -n "$_wr" ] && _rl+="(${_wr})"
    fi
    L1+=("$_rl")
  fi
fi

# Team mode
[ "$is_team" = 1 ] && L1+=("${BOLD}${MAGENTA}[TEAM]${RST}")

# ═══════════════════════════════════════════════════════════════════════════
# LINE 2: COST + CACHE + STATS
# ═══════════════════════════════════════════════════════════════════════════

L2=()

# Cost (with burn rate if available)
if [ -n "$session_cost" ]; then
  _cc=$(ccost "$cost_raw")
  _cost_str="${_cc}${session_cost}${RST}"
  if [ -n "$cost_per_hour" ]; then
    _cost_str+=" ${DIM}(${_cc}\$${cost_per_hour}/h${RST}${DIM})${RST}"
  fi
  L2+=("$_cost_str")
fi

# Total tokens + TPM
if [ "$tok_total" -gt 0 ] 2>/dev/null; then
  _tdisp="$(fv "$tok_total") tok"
  [ -n "$tok_per_min" ] && _tdisp+=" ($(fv "$tok_per_min") tpm)"
  L2+=("${DIM}${_tdisp}${RST}")
fi

# Cache breakdown
if [ "$has_transcript" = 1 ]; then
  _stok=""
  [ "$t_cw" -gt 0 ] 2>/dev/null && _stok+="cw:$(fv "$t_cw")"
  if [ "$t_cr" -gt 0 ] 2>/dev/null; then
    [ -n "$_stok" ] && _stok+=" "
    _stok+="cr:$(fv "$t_cr")"
  fi
  [ -n "$_stok" ] && L2+=("${DIM}${_stok}${RST}")

  # Tool counts + todo progress
  if [ "$t_tc" -gt 0 ] 2>/dev/null; then
    L2+=("${DIM}T:${t_tc}${RST}")
  fi
  if [ "$t_tt" -gt 0 ] 2>/dev/null; then
    L2+=("${DIM}todo:${t_td}/${t_tt}${RST}")
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# LINE 3: AGENTS (only if agents or skills exist)
# ═══════════════════════════════════════════════════════════════════════════

LA=()
if [ "$has_transcript" = 1 ]; then
  [ "$t_ac" -gt 0 ] 2>/dev/null && LA+=("${DIM}Agents:${t_ac}${RST}")
  [ "$t_sc" -gt 0 ] 2>/dev/null && LA+=("${DIM}Skills:${t_sc}${RST}")
  [ "$mcp_count" -gt 0 ] 2>/dev/null && LA+=("${DIM}MCP:${mcp_count}${RST}")
fi

# ═══════════════════════════════════════════════════════════════════════════
# LINE 4: PROJECT
# ═══════════════════════════════════════════════════════════════════════════

LP=()

# Directory + git (compact)
if [ -n "$work_dir" ]; then
  _dir=$(basename "$work_dir")
  if [ -n "$git_branch" ]; then
    LP+=("${YELLOW}${_dir}${RST}${DIM}:${RST}${CYAN}${git_branch}${git_dirty}${RST}")
  else
    LP+=("${YELLOW}${_dir}${RST}")
  fi
fi

# Duration
[ -n "$duration" ] && LP+=("${DIM}${duration}${RST}")

# ═══════════════════════════════════════════════════════════════════════════
# OUTPUT
# ═══════════════════════════════════════════════════════════════════════════

join_parts() {
  local first=1
  for p in "$@"; do
    if [ "$first" = 1 ]; then printf '%s' "$p"; first=0
    else printf '%s%s' "$(sep)" "$p"; fi
  done
}

out=$(join_parts "${L1[@]}")
if [ ${#L2[@]} -gt 0 ]; then
  out+=$'\n'
  out+=$(join_parts "${L2[@]}")
fi
if [ ${#LA[@]} -gt 0 ]; then
  out+=$'\n'
  out+=$(join_parts "${LA[@]}")
fi
if [ ${#LP[@]} -gt 0 ]; then
  out+=$'\n'
  out+=$(join_parts "${LP[@]}")
fi

printf '%s\n' "$out"
