import seedDB from './seed-generated.mjs';
seedDB().then(() => {
  console.log('Seeding complete!');
  process.exit(0);
}).catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
