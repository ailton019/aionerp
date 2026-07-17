const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZGFvcHR2c2JuaGVsYW13eXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNzIxMTQsImV4cCI6MjA5OTg0ODExNH0.I3QKcld6haTURNf9f3VfxduHjx9-9-mjiEdg0HmlqD4';
const url = 'https://madaoptvsbnhelamwyzp.supabase.co/rest/v1';

async function run() {
    try {
        console.log('Testing insert with fornecedor_id = null...');
        const res = await fetch(`${url}/entradas`, {
            method: 'POST',
            headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                data: '2026-06-29',
                observacao: 'TESTE DEVOLUCAO',
                total: 0,
                usuario_id: 1,
                fornecedor_id: null
            })
        });
        
        console.log('Response status:', res.status);
        const data = await res.json();
        console.log('Response body:', JSON.stringify(data, null, 2));

        if (res.status === 201 && data.length > 0) {
            console.log('Insert successful! Deleting test entry...');
            const delRes = await fetch(`${url}/entradas?id=eq.${data[0].id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': apiKey,
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            console.log('Delete status:', delRes.status);
        }
    } catch (e) {
        console.error(e);
    }
}

run();
