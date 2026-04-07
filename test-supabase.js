import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hntllxzoyfzsucpqcbdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhudGxseHpveWZ6c3VjcHFjYmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Mjg5NTQsImV4cCI6MjA5MTEwNDk1NH0.o7KBvotPrEp-PCimsS0JW0lIAOnIKMy-SI2RTe7s_sw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data } = supabase.storage.from('kyvra_images').getPublicUrl('test.png');
  console.log('URL kyvra_images:', data.publicUrl);
  
  const { data: data2 } = supabase.storage.from('kyvra-audio').getPublicUrl('test.mp3');
  console.log('URL kyvra-audio:', data2.publicUrl);
}

test();
