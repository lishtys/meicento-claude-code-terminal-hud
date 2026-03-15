/**
 * MEICENTO HUD - Todo Completion Element
 *
 * Format: todos:2/5 with color based on completion %
 */
import { c, getThresholdColor } from '../colors.js';
import type { TodoItem } from '../types.js';

export function renderTodos(todos: TodoItem[]): string | null {
  if (todos.length === 0) return null;

  const completed = todos.filter(t => t.status === 'completed').length;
  const total = todos.length;
  const percent = (completed / total) * 100;

  // Invert: high completion = green, low = red
  const colorFn = percent >= 90 ? c.green : percent >= 50 ? c.yellow : c.red;

  return colorFn(`todos:${completed}/${total}`);
}
