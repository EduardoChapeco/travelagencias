import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://esmppoxxnyiscidzsjvy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbXBwb3h4bnlpc2NpZHpzanZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTM4NDgsImV4cCI6MjA5NjgyOTg0OH0.qe1dTo-tz-iO-J9tMBXgUKS8-R2rfZipjcAiGf0kZbY'
);

async function testQuery() {
  const { data, error } = await supabase
    .from('payment_installments')
    .select(`
      id, number, due_date, amount, status, payment_method, paid_at, payment_plan_id,
      plan:payment_plans(trip_id, total_amount, trip:trips(title, destination))
    `)
    .limit(1);

  if (error) {
    console.error('PostgREST Error:', error);
  } else {
    console.log('Query successful! Relation is working.');
    console.log(JSON.stringify(data, null, 2));
  }
}

testQuery();
