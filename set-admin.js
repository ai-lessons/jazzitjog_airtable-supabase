

// set-admin.js
const { createClient } = require('@supabase/supabase-js');

// Ваши credentials из Supabase Dashboard
const SUPABASE_URL= 'https://fqcwpcyxofowscluryej.supabase.co';
const SERVICE_ROLE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxY3dwY3l4b2Zvd3NjbHVyeWVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgyNjM5MywiZXhwIjoyMDczNDAyMzkzfQ.QosWygGvcAcHKXVq8RBXXGCJ_DY5YIvOuPM2kl92zFM';


const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setAdminRole() {
  try {
    console.log('🔍 Fetching all users...');
    
    // Получить ВСЕХ пользователей
    const { data, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error fetching users:', listError);
      return;
    }
    
    console.log(`✅ Found ${data.users.length} users total\n`);
    
    // Показать всех пользователей
    console.log('📋 All users in database:');
    data.users.forEach((user, index) => {
      console.log(`\n${index + 1}. User:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Metadata:`, user.user_metadata);
    });
    
    // Найти конкретного пользователя
    const targetEmail = 'a.altalt.t@gmail.com';
    console.log(`\n🎯 Looking for: ${targetEmail}`);
    
    const user = data.users.find(u => u.email === targetEmail);
    
    if (!user) {
      console.error(`\n❌ User with email "${targetEmail}" not found`);
      console.log('\n💡 Available emails:');
      data.users.forEach(u => console.log(`   - ${u.email}`));
      return;
    }
    
    console.log('\n✅ User found!');
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Current metadata:`, user.user_metadata);
    
    // Обновить роль
    console.log('\n🔄 Updating role to admin...');
    
    const { data: updatedUser, error } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          role: 'admin'
        }
      }
    );
    
    if (error) {
      console.error('❌ Update error:', error);
      return;
    }
    
    console.log('\n✅ SUCCESS! Role updated to admin');
    console.log('New metadata:', updatedUser.user.user_metadata);
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error('Full error:', error);
  }
}

setAdminRole();