import os
import shutil
import zipfile

def package_extension():
    source_dir = 'PM_chrome_Extension'
    dist_dir = 'dist_extension'
    zip_name = 'NotionVault_v2.0.0.zip'

    # 1. Clean up dist directory
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir)
    os.makedirs(dist_dir)

    # 2. Files to include
    files_to_copy = [
        'manifest.json',
        'background.js',
        'content.js',
        'popup.html',
        'popup.js',
        'popup.css',
    ]
    
    # 3. Directories to include
    dirs_to_copy = [
        'icons',
        'files'
    ]

    print(f"Packaging extension from {source_dir}...")

    # Copy files
    for f in files_to_copy:
        src = os.path.join(source_dir, f)
        if os.path.exists(src):
            shutil.copy(src, dist_dir)
            print(f"  Copied: {f}")
        else:
            print(f"  Warning: {f} not found!")

    # Copy directories
    for d in dirs_to_copy:
        src = os.path.join(source_dir, d)
        if os.path.exists(src):
            shutil.copytree(src, os.path.join(dist_dir, d))
            print(f"  Copied directory: {d}")

    # 4. Create ZIP
    print(f"Creating ZIP archive: {zip_name}...")
    with zipfile.ZipFile(os.path.join('dist', zip_name), 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                file_path = os.path.join(root, file)
                # Store path relative to dist_dir
                archive_name = os.path.relpath(file_path, dist_dir)
                zipf.write(file_path, archive_name)

    print("\n" + "="*50)
    print("SUCCESS: Extension packaged and ready for distribution!")
    print(f"Location: dist/{zip_name}")
    print("="*50)

if __name__ == "__main__":
    package_extension()
