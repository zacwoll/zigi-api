DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS subtasks;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
	username TEXT NOT NULL,
	balance INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	deleted_at DATETIME
);

-- Table: tasks
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,                      -- UUID
    user_id TEXT NOT NULL,                    -- FK -> users.id
    title TEXT NOT NULL,
    description TEXT,
    success_points INTEGER NOT NULL,
    failure_points INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (
        status IN ('pending', 'in-progress', 'completed', 'failed', 'expired')
    ),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: subtasks
CREATE TABLE subtasks (
    id TEXT PRIMARY KEY,                      -- UUID
    task_id TEXT NOT NULL,                    -- FK -> tasks.id
    title TEXT NOT NULL,
    description TEXT,
    success_points INTEGER NOT NULL,
    failure_points INTEGER NOT NULL,
    completed_at DATETIME,
    expires_at DATETIME,
    status TEXT NOT NULL CHECK (
        status IN ('pending', 'in-progress', 'completed', 'failed', 'expired')
    ),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Table: transactions
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,                      -- UUID
    user_id TEXT NOT NULL,                    -- FK -> users.id
    amount INTEGER NOT NULL,
    reason TEXT,
    related_task_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (related_task_id) REFERENCES tasks(id)
);