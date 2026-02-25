// استخدم هذا الكود في Console للبحث عن جميع ملفات JSON

// البحث عن جميع ملفات JSON في Drive
window.gapi.client.drive.files
  .list({
    q: "mimeType='application/json' and trashed = false",
    fields: 'files(id, name, parents, createdTime, modifiedTime)',
    spaces: 'drive',
    pageSize: 50,
    orderBy: 'modifiedTime desc',
  })
  .then((response) => {
    console.log('=== ALL JSON FILES IN DRIVE ===');
    console.log('Total JSON files found:', response.result.files?.length || 0);

    response.result.files?.forEach((file, i) => {
      console.log(`\nFile ${i + 1}:`);
      console.log('  Name:', file.name);
      console.log('  ID:', file.id);
      console.log('  Parent folder IDs:', file.parents);
      console.log('  Created:', file.createdTime);
      console.log('  Modified:', file.modifiedTime);

      // Get parent folder name
      if (file.parents && file.parents.length > 0) {
        window.gapi.client.drive.files
          .get({
            fileId: file.parents[0],
            fields: 'name',
          })
          .then((parentResponse) => {
            console.log('  Parent folder name:', parentResponse.result.name);
          });
      }
    });
  })
  .catch((err) => {
    console.error('Error:', err);
  });
