// استخدم هذا الكود في Console للتحقق من المجلدات

// 1. البحث عن جميع مجلدات "Family Tree App"
window.gapi.client.drive.files
  .list({
    q: "mimeType='application/vnd.google-apps.folder' and name='Family Tree App' and trashed = false",
    fields: 'files(id, name, createdTime, modifiedTime)',
    spaces: 'drive',
    pageSize: 10,
  })
  .then((response) => {
    console.log('=== ALL "Family Tree App" FOLDERS ===');
    console.log('Number of folders:', response.result.files?.length || 0);
    response.result.files?.forEach((folder, i) => {
      console.log(`\nFolder ${i + 1}:`);
      console.log('  ID:', folder.id);
      console.log('  Name:', folder.name);
      console.log('  Created:', folder.createdTime);
      console.log('  Modified:', folder.modifiedTime);

      // List files in this folder
      window.gapi.client.drive.files
        .list({
          q: `'${folder.id}' in parents and trashed = false`,
          fields: 'files(id, name, mimeType, modifiedTime)',
          spaces: 'drive',
          pageSize: 100,
        })
        .then((filesResponse) => {
          console.log(`  Files in folder (${filesResponse.result.files?.length || 0}):`);
          filesResponse.result.files?.forEach((file) => {
            console.log(`    - ${file.name} (${file.mimeType})`);
          });
        });
    });
  })
  .catch((err) => {
    console.error('Error:', err);
  });
