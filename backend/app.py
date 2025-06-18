from flask import Flask, jsonify, request
from flask_cors import CORS
import database  # Assuming database.py is in the same directory
import sqlite3
import datetime # For createdAt timestamp
import os

app = Flask(__name__)
CORS(app)

# Simplified DB Initialization (ensure it's called appropriately)
if not os.path.exists(database.DATABASE_PATH):
    print("Database file not found, initializing during app setup...")
    database.init_db()
else:
    # This ensures tables are created if db file exists but is empty
    database.init_db()


@app.route('/')
def home():
    return jsonify({"message": "AI Voice Assistant Backend is running!"})

# --- Contacts API ---
@app.route('/contacts', methods=['POST'])
def add_contact_api():
    data = request.json
    name = data.get('name')
    phone = data.get('phone')

    if not name or not phone:
        return jsonify({"error": "Name and phone are required."}), 400

    # Basic validation (can be more extensive)
    if not (1 <= len(name) <= 50):
         return jsonify({"error": "Name length must be between 1 and 50 characters."}), 400
    if not (7 <= len(phone) <= 15 and phone.isdigit()):
         return jsonify({"error": "Phone number must be 7-15 digits."}), 400

    conn = database.get_db_connection()
    try:
        # Check for duplicates (case-insensitive name check)
        existing_contact = conn.execute("SELECT id FROM contacts WHERE LOWER(name) = LOWER(?)", (name,)).fetchone()
        if existing_contact:
            return jsonify({"error": f"Contact with name '{name}' already exists."}), 409 # Conflict

        cursor = conn.cursor()
        created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        cursor.execute("INSERT INTO contacts (name, phone, createdAt) VALUES (?, ?, ?)",
                       (name, phone, created_at))
        conn.commit()
        new_contact_id = cursor.lastrowid

        # Fetch the newly created contact to return it
        new_contact = conn.execute("SELECT * FROM contacts WHERE id = ?", (new_contact_id,)).fetchone()
        return jsonify(dict(new_contact)), 201 # Created
    except sqlite3.Error as e:
        conn.rollback() # Rollback in case of error
        app.logger.error(f"Database error adding contact: {e}")
        return jsonify({"error": "Database operation failed."}), 500
    finally:
        if conn:
            conn.close()

@app.route('/contacts', methods=['GET'])
def get_contacts_api():
    conn = database.get_db_connection()
    try:
        contacts_cursor = conn.execute("SELECT id, name, phone, createdAt FROM contacts ORDER BY name COLLATE NOCASE")
        contacts_list = [dict(row) for row in contacts_cursor.fetchall()]
        return jsonify(contacts_list), 200
    except sqlite3.Error as e:
        app.logger.error(f"Database error fetching contacts: {e}")
        return jsonify({"error": "Database operation failed."}), 500
    finally:
        if conn:
            conn.close()

# ... (Basic echo chat endpoint, placeholder for future Gemini integration) ...
@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '').strip() if data else ''
    if not user_message:
        return jsonify({"error": "Message is required."}), 400

    # Simple rule-based response for now
    if '你好' in user_message or '您好' in user_message:
        reply = '你好，很高兴与您聊天。'
    elif '谢谢' in user_message:
        reply = '不用客气！'
    else:
        reply = f"你说：{user_message}"

    return jsonify({"reply": reply}), 200

@app.route('/reminders', methods=['GET'])
def get_reminders_api():
    conn = database.get_db_connection()
    try:
        reminders_cursor = conn.execute(
            "SELECT * FROM medication_reminders ORDER BY id"
        )
        reminders_list = [dict(row) for row in reminders_cursor.fetchall()]
        return jsonify(reminders_list), 200
    except sqlite3.Error as e:
        app.logger.error(f"Database error fetching reminders: {e}")
        return jsonify({"error": "Database operation failed."}), 500
    finally:
        if conn:
            conn.close()

@app.route('/reminders/due', methods=['GET'])
def get_due_reminders_api():
    conn = database.get_db_connection()
    due_reminders_list = []
    try:
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        current_date_str = now_utc.strftime('%Y-%m-%d')
        current_time_str = now_utc.strftime('%H:%M')

        # Fetch all potentially relevant reminders (not fully acknowledged 'once' or not acknowledged today 'daily')
        # More complex filtering can be done in Python if SQL gets too convoluted,
        # but basic filtering can be done in SQL.
        reminders_cursor = conn.execute("""
            SELECT * FROM medication_reminders
            WHERE
                (frequency = 'once' AND acknowledged = FALSE)
                OR
                (frequency = 'daily')
        """)

        all_potential_reminders = [dict(row) for row in reminders_cursor.fetchall()]

        for reminder in all_potential_reminders:
            reminder_time_dt = datetime.datetime.strptime(reminder['time'], '%H:%M').time()
            current_time_dt = now_utc.time()

            is_due = False
            if reminder['frequency'] == 'once':
                # Check if date is today, time is due, and not acknowledged
                if reminder['date'] == current_date_str and reminder_time_dt <= current_time_dt:
                    if not reminder['acknowledged']: # Double check, though SQL query should handle this
                        is_due = True

            elif reminder['frequency'] == 'daily':
                # Check if time is due and not acknowledged today
                if reminder_time_dt <= current_time_dt:
                    if reminder['lastAcknowledgedDate'] != current_date_str:
                        is_due = True

            if is_due:
                # To avoid re-triggering constantly within the same minute for a specific reminder instance
                # we can add a temporary flag or check lastTriggeredAt field if we add one for this purpose.
                # For now, client-side or a more nuanced backend logic might handle snooze/re-alert.
                # This endpoint will simply return what's currently "active" based on criteria.

                # Let's check if it was already triggered for this specific slot today (for daily)
                # or if this 'once' reminder was already triggered in this app session (if we had such a flag)
                # The schema has lastTriggeredDate and lastTriggeredTime.
                # This logic is to prevent it from being "due" repeatedly if already announced for this slot.

                # If a daily reminder was already triggered for its time slot today, it's not "due" for announcement again
                # until the next day, unless acknowledged.
                # If it was triggered but not acknowledged, it is still "due".
                # The `lastAcknowledgedDate` check handles the "acknowledged" part.
                # The `lastTriggeredDate` and `lastTriggeredTime` can be used to prevent immediate re-announcement
                # by whatever system calls this endpoint. This endpoint itself should report it as due if criteria met.

                # The current logic: if it's time, and not acknowledged for today (daily) or ever (once), it's due.
                due_reminders_list.append(reminder)

        return jsonify(due_reminders_list), 200
    except sqlite3.Error as e:
        app.logger.error(f"Database error fetching due reminders: {e}")
        return jsonify({"error": "Database operation failed while fetching due reminders."}), 500
    except Exception as e: # Catch other potential errors like strptime failures if data is bad
        app.logger.error(f"Error processing due reminders: {e}")
        return jsonify({"error": "Failed to process due reminders."}), 500
    finally:
        if conn:
            conn.close()

@app.route('/reminders', methods=['POST'])
def add_reminder_api():
    data = request.json
    medicine = data.get('medicine')
    time_str = data.get('time') # HH:MM
    date_str = data.get('date') # YYYY-MM-DD or 'everyday'
    frequency = data.get('frequency') # 'once' or 'daily'
    original_query = data.get('originalQuery', '') # Optional

    # Validation
    if not all([medicine, time_str, date_str, frequency]):
        return jsonify({"error": "Missing required fields (medicine, time, date, frequency)."}), 400

    if not (1 <= len(medicine) <= 100):
        return jsonify({"error": "Medicine name length must be between 1 and 100 characters."}), 400

    try:
        # Validate time format HH:MM
        datetime.datetime.strptime(time_str, '%H:%M')
    except ValueError:
        return jsonify({"error": "Invalid time format. Expected HH:MM."}), 400

    if frequency not in ['once', 'daily']:
        return jsonify({"error": "Frequency must be 'once' or 'daily'."}), 400

    if frequency == 'once':
        try:
            # Validate date format YYYY-MM-DD for 'once' reminders
            datetime.datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            # Allow 'everyday' for frequency 'daily', but for 'once' it must be a specific date
             if date_str != 'everyday': # This condition might be redundant if we strictly expect YYYY-MM-DD for 'once'
                return jsonify({"error": "Invalid date format for 'once' reminder. Expected YYYY-MM-DD."}), 400
    elif frequency == 'daily' and date_str != 'everyday':
        # While a daily reminder could technically start on a specific date,
        # our current frontend model uses 'everyday' for the date field of daily reminders.
        # We can simplify or make this more flexible later. For now, align with current model.
        # Or, if date_str is a valid YYYY-MM-DD for a daily, it implies it starts then and is daily.
        # Let's assume for now that 'daily' frequency implies date_str should be 'everyday' from frontend.
        # If not, we could also parse YYYY-MM-DD and store it as the start date.
        # For this implementation, we'll be strict: if frequency is 'daily', date_str must be 'everyday'.
         # This can be relaxed if the data model evolves.
        # Actually, the original schema and frontend logic implies 'date' for daily is just 'everyday'
        # and for 'once' it's 'YYYY-MM-DD'. Let's stick to that.
        if date_str != 'everyday':
             return jsonify({"error": "For 'daily' frequency, 'date' field must be 'everyday'."}), 400


    conn = database.get_db_connection()
    try:
        created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Initialize optional fields that might not be passed for all reminders
        # (especially from older frontend versions or simpler setups)
        last_acknowledged_date = None
        last_triggered_date = None
        last_triggered_time = None
        acknowledged_flag = False # Default for new reminders

        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO medication_reminders
            (medicine, time, date, frequency, originalQuery, createdAt,
             lastAcknowledgedDate, lastTriggeredDate, lastTriggeredTime, acknowledged)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (medicine, time_str, date_str, frequency, original_query, created_at,
              last_acknowledged_date, last_triggered_date, last_triggered_time, acknowledged_flag))
        conn.commit()
        new_reminder_id = cursor.lastrowid

        new_reminder = conn.execute("SELECT * FROM medication_reminders WHERE id = ?", (new_reminder_id,)).fetchone()
        return jsonify(dict(new_reminder)), 201
    except sqlite3.Error as e:
        conn.rollback()
        app.logger.error(f"Database error adding reminder: {e}")
        return jsonify({"error": "Database operation failed while adding reminder."}), 500
    finally:
        if conn:
            conn.close()

@app.route('/reminders/<int:reminder_id>/acknowledge', methods=['POST'])
def acknowledge_reminder_api(reminder_id):
    conn = database.get_db_connection()
    try:
        # Check if reminder exists
        reminder = conn.execute("SELECT * FROM medication_reminders WHERE id = ?", (reminder_id,)).fetchone()
        if reminder is None:
            return jsonify({"error": "Reminder not found."}), 404

        reminder_dict = dict(reminder)
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        current_date_str = now_utc.strftime('%Y-%m-%d')

        if reminder_dict['frequency'] == 'once':
            # For 'once' reminders, set acknowledged to True and record acknowledgement date
            conn.execute("""
                UPDATE medication_reminders
                SET acknowledged = TRUE, lastAcknowledgedDate = ?
                WHERE id = ?
            """, (current_date_str, reminder_id))
        elif reminder_dict['frequency'] == 'daily':
            # For 'daily' reminders, just update the lastAcknowledgedDate for today
            conn.execute("""
                UPDATE medication_reminders
                SET lastAcknowledgedDate = ?
                WHERE id = ?
            """, (current_date_str, reminder_id))
        else:
            # Should not happen if data is clean, but handle defensively
            return jsonify({"error": "Invalid reminder frequency."}), 400

        conn.commit()

        # Fetch the updated reminder to return it
        updated_reminder = conn.execute("SELECT * FROM medication_reminders WHERE id = ?", (reminder_id,)).fetchone()
        if updated_reminder is None: # Should not happen if previous check passed and update was fine
             app.logger.error(f"Failed to fetch reminder {reminder_id} after acknowledgement update.")
             return jsonify({"error": "Failed to retrieve reminder after update."}), 500

        return jsonify(dict(updated_reminder)), 200

    except sqlite3.Error as e:
        conn.rollback()
        app.logger.error(f"Database error acknowledging reminder {reminder_id}: {e}")
        return jsonify({"error": "Database operation failed while acknowledging reminder."}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error acknowledging reminder {reminder_id}: {e}")
        return jsonify({"error": "An unexpected error occurred."}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/reminders/test')
def test_reminders_route():
    return jsonify({'message': 'Reminder test route OK'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
