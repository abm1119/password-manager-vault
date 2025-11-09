import string
import random
import re
import math
import pyperclip
import threading
import time

class PasswordGenerator:
    """Password generator with customizable options"""
    
    @staticmethod
    def generate_password(length=16, use_uppercase=True, use_lowercase=True, 
                         use_digits=True, use_symbols=True, exclude_similar=False):
        """Generate a random password with specified options"""
        
        # Define character sets
        chars = ""
        if use_lowercase:
            chars += string.ascii_lowercase
        if use_uppercase:
            chars += string.ascii_uppercase
        if use_digits:
            chars += string.digits
        if use_symbols:
            chars += string.punctuation
            
        # Remove similar characters if requested
        if exclude_similar:
            for c in 'Il1O0':
                chars = chars.replace(c, '')
                
        # Ensure we have characters to work with
        if not chars:
            chars = string.ascii_letters + string.digits
            
        # Generate password
        password = ''.join(random.choice(chars) for _ in range(length))
        
        # Ensure password meets minimum requirements
        if use_uppercase and not any(c.isupper() for c in password):
            password = PasswordGenerator._replace_random_char(password, string.ascii_uppercase)
        if use_lowercase and not any(c.islower() for c in password):
            password = PasswordGenerator._replace_random_char(password, string.ascii_lowercase)
        if use_digits and not any(c.isdigit() for c in password):
            password = PasswordGenerator._replace_random_char(password, string.digits)
        if use_symbols and not any(c in string.punctuation for c in password):
            password = PasswordGenerator._replace_random_char(password, string.punctuation)
            
        return password
    
    @staticmethod
    def _replace_random_char(password, char_set):
        """Replace a random character in the password with one from the given character set"""
        if not password:
            return random.choice(char_set)
            
        idx = random.randint(0, len(password) - 1)
        return password[:idx] + random.choice(char_set) + password[idx+1:]


class PasswordStrengthChecker:
    """Evaluates password strength and provides feedback"""
    
    @staticmethod
    def check_strength(password):
        """
        Check password strength and return a score from 0-100 and feedback
        """
        if not password:
            return 0, "Password is empty"
            
        score = 0
        feedback = []
        
        # Length contribution (up to 40 points)
        length_score = min(40, len(password) * 2.5)
        score += length_score
        
        # Character variety (up to 40 points)
        has_lower = bool(re.search(r'[a-z]', password))
        has_upper = bool(re.search(r'[A-Z]', password))
        has_digit = bool(re.search(r'\d', password))
        has_symbol = bool(re.search(r'\W', password))
        
        variety_score = (has_lower + has_upper + has_digit + has_symbol) * 10
        score += variety_score
        
        # Entropy contribution (up to 20 points)
        char_set_size = 0
        if has_lower: char_set_size += 26
        if has_upper: char_set_size += 26
        if has_digit: char_set_size += 10
        if has_symbol: char_set_size += 33  # Approximate number of special characters
        
        if char_set_size > 0:
            entropy = len(password) * math.log2(char_set_size)
            entropy_score = min(20, entropy / 3)
            score += entropy_score
        
        # Generate feedback
        if len(password) < 8:
            feedback.append("Password is too short")
        if not has_lower:
            feedback.append("Add lowercase letters")
        if not has_upper:
            feedback.append("Add uppercase letters")
        if not has_digit:
            feedback.append("Add numbers")
        if not has_symbol:
            feedback.append("Add special characters")
            
        # Check for common patterns
        if re.search(r'12345|qwerty|password|admin', password.lower()):
            score = max(0, score - 20)
            feedback.append("Avoid common patterns")
            
        # Categorize strength
        strength = "Very Weak"
        if score >= 20: strength = "Weak"
        if score >= 40: strength = "Moderate"
        if score >= 60: strength = "Strong"
        if score >= 80: strength = "Very Strong"
        
        return min(100, int(score)), strength, feedback


class SecureClipboard:
    """Handles secure clipboard operations with auto-clear functionality"""
    
    _clear_timer = None
    
    @staticmethod
    def copy_to_clipboard(text, clear_after=30):
        """
        Copy text to clipboard and clear after specified seconds
        """
        # Cancel any existing timer
        if SecureClipboard._clear_timer:
            SecureClipboard._clear_timer.cancel()
            
        # Copy to clipboard
        pyperclip.copy(text)
        
        # Set timer to clear
        if clear_after > 0:
            SecureClipboard._clear_timer = threading.Timer(
                clear_after, SecureClipboard.clear_clipboard)
            SecureClipboard._clear_timer.daemon = True
            SecureClipboard._clear_timer.start()
            
        return f"Copied to clipboard (will clear in {clear_after} seconds)"
    
    @staticmethod
    def clear_clipboard():
        """Clear the clipboard contents"""
        pyperclip.copy('')
        return "Clipboard cleared"
