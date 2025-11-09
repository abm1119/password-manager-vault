import os
import logging
import pickle
import socket
from flask import Flask, render_template, request, redirect, url_for, flash, session
try:
    from waitress import serve
except ImportError:
    serve = None
from db_handler import (
    DatabaseManager,
    check_master_password,
    setup_new_vault,
)

# Setup logging
logging.basicConfig(
    filename="app.log",
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24).hex())

@app.route('/')
def index():
    if 'cipher' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('dashboard'))

@app.route('/logout')
def logout():
    session.pop('cipher', None)
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password')
        if password:
            ok, cipher = check_master_password(password)
            if ok:
                session['cipher'] = pickle.dumps(cipher).decode('latin1')
                return redirect(url_for('dashboard'))
            else:
                flash('Incorrect password', 'error')
        else:
            flash('Password required', 'error')
    return render_template('login.html')

@app.route('/setup', methods=['GET', 'POST'])
def setup():
    if os.path.exists('vault.db'):
        return redirect(url_for('login'))
    if request.method == 'POST':
        p1 = request.form.get('password1')
        p2 = request.form.get('password2')
        if p1 and p2 and p1 == p2 and len(p1) >= 8:
            cipher = setup_new_vault(p1)
            session['cipher'] = pickle.dumps(cipher).decode('latin1')
            return redirect(url_for('dashboard'))
        else:
            flash('Passwords must match and be at least 8 characters', 'error')
    return render_template('setup.html')

@app.route('/dashboard')
def dashboard():
    if 'cipher' not in session:
        return redirect(url_for('login'))
    cipher = pickle.loads(session['cipher'].encode('latin1'))
    db = DatabaseManager(cipher)
    folders = db.fetch_folders()
    if folders:
        folder_id = request.args.get('folder', folders[0][0])
        blocks = db.fetch_blocks(folder_id)
    else:
        folder_id = None
        blocks = []
    return render_template('dashboard.html', folders=folders, blocks=blocks, current_folder=folder_id)

@app.route('/add_folder', methods=['POST'])
def add_folder():
    if 'cipher' not in session:
        return redirect(url_for('login'))
    name = request.form.get('name')
    if name:
        cipher = pickle.loads(session['cipher'].encode('latin1'))
        db = DatabaseManager(cipher)
        db.add_folder(name)
    return redirect(url_for('dashboard'))

@app.route('/rename_folder', methods=['POST'])
def rename_folder():
    if 'cipher' not in session:
        return redirect(url_for('login'))
    fid = request.form.get('fid')
    new_name = request.form.get('new_name')
    if fid and new_name:
        cipher = pickle.loads(session['cipher'].encode('latin1'))
        db = DatabaseManager(cipher)
        db.update_folder(int(fid), new_name)
    return redirect(url_for('dashboard'))

@app.route('/delete_folder', methods=['POST'])
def delete_folder():
    if 'cipher' not in session:
        return redirect(url_for('login'))
    fid = request.form.get('fid')
    if fid:
        cipher = pickle.loads(session['cipher'].encode('latin1'))
        db = DatabaseManager(cipher)
        db.delete_folder(int(fid))
    return redirect(url_for('dashboard'))

@app.route('/add_block/<btype>', methods=['GET', 'POST'])
def add_block(btype):
    if 'cipher' not in session:
        return redirect(url_for('login'))
    cipher = pickle.loads(session['cipher'].encode('latin1'))
    db = DatabaseManager(cipher)
    folder_id = request.args.get('folder', 1)  # default to first
    if request.method == 'POST':
        form_data = request.form.to_dict()
        if btype == 'Table':
            table_data = form_data.get('table_data', '')
            data = dict(line.split(':', 1) for line in table_data.split('\n') if line.strip() and ':' in line)
        elif btype == 'Credential':
            data = {
                'site': form_data.get('site'),
                'username': form_data.get('username'),
                'email': form_data.get('email'),
                'password': form_data.get('password'),
                'notes': form_data.get('notes'),
                'custom': {}
            }
        else:
            data = form_data.get('content') or form_data.get('text') or form_data.get('table_data', '')
        db.add_block(int(folder_id), btype, data)
        return redirect(url_for('dashboard', folder=folder_id))
    return render_template('add_block.html', btype=btype, folder_id=folder_id)

@app.route('/edit_block/<int:bid>', methods=['GET', 'POST'])
def edit_block(bid):
    if 'cipher' not in session:
        return redirect(url_for('login'))
    cipher = pickle.loads(session['cipher'].encode('latin1'))
    db = DatabaseManager(cipher)
    block = db.fetch_block(bid)
    if not block:
        flash('Block not found', 'error')
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        form_data = request.form.to_dict()
        if block['btype'] == 'Table':
            table_data = form_data.get('table_data', '')
            data = dict(line.split(':', 1) for line in table_data.splitlines() if line.strip() and ':' in line)
        elif block['btype'] == 'Credential':
            data = {
                'site': form_data.get('site'),
                'username': form_data.get('username'),
                'email': form_data.get('email'),
                'password': form_data.get('password'),
                'notes': form_data.get('notes'),
                'custom': {}
            }
        else:
            data = form_data.get('content') or form_data.get('text') or form_data.get('table_data', '')
        db.update_block(bid, data)
        return redirect(url_for('dashboard'))
    return render_template('edit_block.html', block=block)

@app.route('/delete_block/<int:bid>', methods=['POST'])
def delete_block(bid):
    if 'cipher' not in session:
        return redirect(url_for('login'))
    cipher = pickle.loads(session['cipher'].encode('latin1'))
    db = DatabaseManager(cipher)
    db.delete_block(bid)
    return redirect(url_for('dashboard'))

@app.route('/move_block/<int:bid>/<direction>')
def move_block(bid, direction):
    if 'cipher' not in session:
        return redirect(url_for('login'))
    cipher = pickle.loads(session['cipher'].encode('latin1'))
    db = DatabaseManager(cipher)
    # Get current folder
    folder_id = request.args.get('folder', 1)
    blocks = db.fetch_blocks(int(folder_id))
    ids = [b[0] for b in blocks]
    try:
        idx = ids.index(bid)
        if direction == 'up' and idx > 0:
            # Swap with previous
            db.reorder_block(bid, blocks[idx-1][0])
        elif direction == 'down' and idx < len(ids) - 1:
            # Swap with next
            db.reorder_block(bid, blocks[idx+1][0])
    except ValueError:
        pass
    return redirect(url_for('dashboard', folder=folder_id))

# Add more routes for CRUD operations

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

if __name__ == '__main__':
    ip = get_local_ip()
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    print(f"Web app is running on:")
    print(f"Local: http://127.0.0.1:{port}")
    print(f"Network: http://{ip}:{port}")
    print("Click the links above to open in your browser.")
    if debug:
        app.run(debug=True, host='0.0.0.0', port=port)
    else:
        if serve:
            serve(app, host='0.0.0.0', port=port)
        else:
            app.run(host='0.0.0.0', port=port)
