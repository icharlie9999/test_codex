-- Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    UNIQUE(name) -- Assuming names should be unique for simplicity
);

-- Medication Reminders Table
CREATE TABLE IF NOT EXISTS medication_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine TEXT NOT NULL,
    time TEXT NOT NULL,       -- HH:MM format
    date TEXT NOT NULL,       -- YYYY-MM-DD or 'everyday'
    originalQuery TEXT,
    frequency TEXT NOT NULL,  -- 'once' or 'daily'
    lastAcknowledgedDate TEXT, -- YYYY-MM-DD
    lastTriggeredDate TEXT,    -- YYYY-MM-DD
    lastTriggeredTime TEXT,    -- HH:MM
    createdAt TEXT NOT NULL,
    -- Add a flag to mark if a 'once' reminder has been completed/acknowledged fully
    acknowledged BOOLEAN DEFAULT FALSE
);
