const supabase = require('./supabaseClient');

async function test() {
    const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

    if (error) {
        console.log('Error code:', error.code);
        console.log('Error message:', error.message);
        console.log('Error details:', error.details);
    } else {
        console.log('✅ Connected successfully! Supabase is working.');
        console.log('Data:', data);
    }
}

test();