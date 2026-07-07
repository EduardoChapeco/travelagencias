SELECT conname, contype, conrelid::regclass, confrelid::regclass 
FROM pg_constraint 
WHERE conrelid = 'payment_installments'::regclass;
