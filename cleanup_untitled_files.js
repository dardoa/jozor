// استخدم هذا الكود في Console لحذف جميع ملفات "untitled" من My Drive

async function cleanupUntitledFiles() {
  console.log('🧹 Starting cleanup of untitled files...');

  try {
    // Search for all files named "untitled" or "Untitled" (not in trash)
    const response = await window.gapi.client.drive.files.list({
      q: "(name='untitled' or name='Untitled' or name='untitled.json' or name='Untitled.json') and trashed = false",
      fields: 'files(id, name, parents, createdTime)',
      spaces: 'drive',
      pageSize: 100,
    });

    const files = response.result.files || [];
    console.log(`Found ${files.length} untitled files`);

    if (files.length === 0) {
      console.log('✅ No untitled files found. All clean!');
      return;
    }

    // Show files before deleting
    console.log('\n📋 Files to be deleted:');
    files.forEach((file, i) => {
      console.log(`${i + 1}. ${file.name} (ID: ${file.id}, Created: ${file.createdTime})`);
    });

    // Ask for confirmation
    const confirm = window.confirm(
      `Found ${files.length} untitled files.\n\nDo you want to move them to trash?\n\n(They won't be permanently deleted, just moved to trash)`
    );

    if (!confirm) {
      console.log('❌ Cleanup cancelled by user');
      return;
    }

    // Delete files
    console.log('\n🗑️ Moving files to trash...');
    let deleted = 0;

    for (const file of files) {
      try {
        await window.gapi.client.drive.files.update({
          fileId: file.id,
          resource: { trashed: true },
        });
        console.log(`✅ Moved to trash: ${file.name}`);
        deleted++;
      } catch (err) {
        console.error(`❌ Failed to delete ${file.name}:`, err);
      }
    }

    console.log(`\n✅ Cleanup complete! Moved ${deleted}/${files.length} files to trash.`);
    console.log('💡 You can restore them from Google Drive trash if needed.');
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
  }
}

// Run the cleanup
cleanupUntitledFiles();
