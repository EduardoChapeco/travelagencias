-- Grant execute permission on record_legal_acceptance to anon users for public portal access
GRANT EXECUTE ON FUNCTION public.record_legal_acceptance(uuid, uuid, uuid, text) TO anon, authenticated;
