/**
 * Todos Element: ▸ 3/7  or  ✓ 7/7
 */
import { C, ICONS } from '../colors.js';
import type { TodoItem } from '../types.js';

export function renderTodos(todos: TodoItem[]): string | null {
  if (todos.length === 0) return null;

  const completed = todos.filter(t => t.status === 'completed').length;
  const total = todos.length;

  if (completed === total) {
    return `${C.green(ICONS.completed)} ${C.green(`${completed}/${total}`)}`;
  }

  return `${C.yellow(ICONS.todo)} ${C.dim(`${completed}/${total}`)}`;
}
