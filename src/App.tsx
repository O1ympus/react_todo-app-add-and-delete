/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import {
  deleteTodo,
  getTodos,
  patchTodo,
  postTodo,
  USER_ID,
} from './api/todos';
import { Todo } from './types/Todo';
import cn from 'classnames';
import { TodoWithLoading } from './types/TodoWithLoading';

function areAllTodosCompleted(todos: Todo[]) {
  return todos.every(todo => todo.completed);
}

export const App: React.FC = () => {
  const [todos, setTodos] = useState<TodoWithLoading[]>([]);
  const [isError, setIsError] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [flag, setFlag] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoading(true);
    getTodos()
      .then(setTodos)
      .catch(() => {
        setIsError(true);
        setErrorMessage('Unable to load todos');
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (isError) {
      setTimeout(() => {
        setIsError(false);
        setErrorMessage('');
      }, 3000);
    }
  }, [isError]);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') {
      return !todo.completed;
    }

    if (filter === 'completed') {
      return todo.completed;
    }

    return true;
  });

  return !USER_ID ? (
    <UserWarning />
  ) : (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length !== 0 && (
            <button
              type="button"
              className={cn('todoapp__toggle-all', {
                active: areAllTodosCompleted(todos),
              })}
              data-cy="ToggleAllButton"
              onClick={() => {
                setTodos(prevTodos => {
                  return prevTodos.map(todo => ({
                    ...todo,
                    completed: !flag,
                  }));
                });
                setFlag(prevState => !prevState);
              }}
            />
          )}
          <form
            onSubmit={event => {
              event.preventDefault();

              const title = query.trim();

              if (!title) {
                setIsError(true);
                setErrorMessage('Title should not be empty');
              } else {
                setIsLoading(true);

                const tempId = Date.now();
                const tempTodo: TodoWithLoading = {
                  id: tempId,
                  userId: USER_ID,
                  title,
                  completed: false,
                  loading: true,
                };

                setTodos(prevState => [...prevState, tempTodo]);

                postTodo(title)
                  .then(newTodo => {
                    setTodos(prevTodos =>
                      prevTodos
                        .filter(t => t.id !== tempTodo.id)
                        .concat({ ...newTodo, loading: false }),
                    );
                    setQuery('');
                  })
                  .catch(() => {
                    setIsError(true);
                    setErrorMessage('Unable to add a todo');
                    setTodos(prev => prev.filter(t => t.id !== tempTodo.id));
                  })
                  .finally(() => setIsLoading(false));
              }
            }}
          >
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={query}
              onChange={event => setQuery(event.target.value)}
              autoFocus
              disabled={isLoading}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {filteredTodos.map(todo => (
            <div
              data-cy="Todo"
              className={cn('todo', { completed: todo.completed })}
              style={{
                display:
                  (todo.completed && filter === 'completed') ||
                  (!todo.completed && filter === 'active') ||
                  filter === 'all'
                    ? 'block'
                    : 'none',
              }}
              key={todo.id}
            >
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                  onChange={() => {
                    const newCompleted = !todo.completed;

                    setIsLoading(true);

                    patchTodo(todo.id, { completed: newCompleted })
                      .then(() => {
                        setTodos(prevTodos =>
                          prevTodos.map(t => {
                            return t.id === todo.id
                              ? { ...t, completed: newCompleted }
                              : t;
                          }),
                        );
                      })
                      .catch(() => {
                        setIsError(true);
                        setErrorMessage('Unable to update a todo');
                      })
                      .finally(() => setIsLoading(false));
                  }}
                />
              </label>

              <span data-cy="TodoTitle" className="todo__title">
                {todo.title}
              </span>

              {/* Remove button appears only on hover */}
              <button
                type="button"
                className="todo__remove"
                data-cy="TodoDelete"
                onClick={event => {
                  event.preventDefault();

                  setTodos(prevTodos =>
                    prevTodos.map(t =>
                      t.id === todo.id ? { ...t, loading: true } : t,
                    ),
                  );

                  deleteTodo(todo.id)
                    .then(deletedId => {
                      setTodos(prevTodos =>
                        prevTodos.filter(
                          currentTodo => currentTodo.id !== deletedId,
                        ),
                      );
                      inputRef.current?.focus();
                    })
                    .catch(() => {
                      setIsError(true);
                      setErrorMessage('Unable to delete a todo');
                      // Reset loading if error occurs
                      setTodos(prevTodos =>
                        prevTodos.map(t =>
                          t.id === todo.id ? { ...t, loading: false } : t,
                        ),
                      );
                    });
                }}
              >
                ×
              </button>

              {/* overlay will cover the todo while it is being deleted or updated */}
              <div
                data-cy="TodoLoader"
                className={cn('modal overlay', {
                  'is-active': todo.loading,
                })}
              >
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          ))}
        </section>

        {todos.length !== 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos
                .filter(todo => !todo.loading) // ignore temp todos
                .reduce(
                  (count, todo) => count + (!todo.completed ? 1 : 0),
                  0,
                )}{' '}
              items left
            </span>

            {/* Active link should have the 'selected' class */}
            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={cn('filter__link', { selected: filter === 'all' })}
                data-cy="FilterLinkAll"
                onClick={() => setFilter('all')}
              >
                All
              </a>

              <a
                href="#/active"
                className={cn('filter__link', {
                  selected: filter === 'active',
                })}
                data-cy="FilterLinkActive"
                onClick={() => setFilter('active')}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={cn('filter__link', {
                  selected: filter === 'completed',
                })}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilter('completed')}
              >
                Completed
              </a>
            </nav>
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!todos.some(t => t.completed)}
              onClick={event => {
                const completedTodos = todos.filter(t => t.completed);

                event.preventDefault();

                setIsLoading(true);

                Promise.all(completedTodos.map(t => deleteTodo(t.id)))
                  .then(deletedIds => {
                    setTodos(prevTodos =>
                      prevTodos.filter(t => !deletedIds.includes(t.id)),
                    );
                  })
                  .catch(() => {
                    setIsError(true);
                    setErrorMessage('Unable to delete a todo');
                  })
                  .finally(() => setIsLoading(false));
              }}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}
      <div
        data-cy="ErrorNotification"
        className={cn(
          'notification is-danger is-light has-text-weight-normal',
          { hidden: !isError },
        )}
      >
        <button data-cy="HideErrorButton" type="button" className="delete" />
        {errorMessage ? errorMessage : ''}
      </div>
    </div>
  );
};
