import sys
import json
import struct
import os

# Ensure we can import modules from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db_handler import DatabaseManager, check_master_password, SimpleCipher

import logging
logging.basicConfig(filename='native_host.log', level=logging.DEBUG)

def send_message(message):
    """Send a JSON message to Chrome."""
    logging.debug(f"Sending: {message}")
    encoded_message = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('I', len(encoded_message)))
    sys.stdout.buffer.write(encoded_message)
    sys.stdout.buffer.flush()

def read_message():
    """Read a JSON message from Chrome."""
    print("Reading...", file=sys.stderr) # Debug log to stderr
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        sys.exit(0)
    message_length = struct.unpack('I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def handle_login(data):
    pwd = data.get('password')
    ok, cipher = check_master_password(pwd)
    if ok:
        return {'success': True, 'key': cipher.key.hex()}
    return {'success': False, 'error': 'Invalid Password'}

def handle_fetch(data):
    key_hex = data.get('key')
    if not key_hex:
        return {'error': 'No key provided'}
    
    try:
        cipher = SimpleCipher(key=bytes.fromhex(key_hex))
        db = DatabaseManager(cipher)
        folders = db.fetch_folders()
        entries = []
        for fid, fname in folders:
             blocks = db.fetch_blocks(fid)
             for bid, btype, blk_data in blocks:
                 if btype == 'Credential':
                     entries.append({
                         'id': bid,
                         'site': blk_data.get('site'),
                         'username': blk_data.get('username'),
                         'password': blk_data.get('password')
                     })
        return {'entries': entries}
    except Exception as e:
        return {'error': str(e)}

def handle_add(data):
    key_hex = data.get('key')
    entry = data.get('entry')
    if not key_hex or not entry:
        return {'error': 'Missing data'}
    
    try:
        cipher = SimpleCipher(key=bytes.fromhex(key_hex))
        db = DatabaseManager(cipher)
        
        # We'll add to 'Default' folder for simplicity or create if not exists
        folders = db.fetch_folders()
        default_folder_id = None
        for fid, fname in folders:
            if fname == 'Default' or fname == 'Extension':
                default_folder_id = fid
                break
        
        if default_folder_id is None:
            default_folder_id = db.add_folder('Extension')

        db.add_block(default_folder_id, 'Credential', entry)
        return {'success': True}
    except Exception as e:
        return {'error': str(e)}

def main():
    while True:
        try:
            msg = read_message()
            cmd = msg.get('command')
            
            if cmd == 'login':
                resp = handle_login(msg)
            elif cmd == 'fetch':
                resp = handle_fetch(msg)
            elif cmd == 'add':
                resp = handle_add(msg)
            elif cmd == 'ping':
                resp = {'pong': True}
            else:
                resp = {'error': 'Unknown command'}
            
            send_message(resp)
        except Exception as e:
            send_message({'error': str(e)})

if __name__ == '__main__':
    # Windows-specific: Ensure binary mode for stdin/stdout
    if sys.platform == "win32":
        import msvcrt
        msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    
    main()
