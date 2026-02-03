import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/infrastructure/database/mongoose/models/iam/users/user.model';
import Role from '../src/infrastructure/database/mongoose/models/iam/rbac/role.model';
import Membership from '../src/infrastructure/database/mongoose/models/iam/rbac/membership.model';

// Ensure ENCRYPTION_KEY is present for User model
if (!process.env.ENCRYPTION_KEY) {
    if (!process.env.FIELD_ENCRYPTION_SECRET) {
        // Default dev key
        process.env.ENCRYPTION_KEY = '02207fcc1b5ce31788490e5cebf0deafb7000b20223942900fffd2c1bbb780';
    } else {
        process.env.ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_SECRET;
    }
}

async function updateUserRole() {
    const email = 'seller13@electronicsplus.in';
    const newRole = 'staff';

    console.log(`🚀 Starting role update for ${email} to ${newRole}...`);

    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Register models to ensure they are available for the hooks
        if (!mongoose.models.Role) mongoose.model('Role', Role.schema);
        if (!mongoose.models.Membership) mongoose.model('Membership', Membership.schema);

        const user = await User.findOne({ email });

        if (!user) {
            console.error(`❌ User not found with email: ${email}`);
            process.exit(1);
        }

        console.log(`Found user: ${user.name} (${user._id})`);
        console.log(`Current Role: ${user.role}`);

        if (user.role === newRole) {
            console.log('⚠️ User already has the requested role.');
        } else {
            // We use findOneAndUpdate to trigger the pre('findOneAndUpdate') hook 
            // which handles RBAC syncing (platformRole, etc.) as seen in the model file.
            // However, the model file also has a pre('save') hook. 
            // Using save() is generally safer for document updates to ensure all hooks run on the instance.

            user.role = newRole as any;
            await user.save();
            console.log(`✅ Successfully updated role to: ${newRole}`);

            // Verify update
            const updatedUser = await User.findById(user._id);
            console.log(`Verified Role: ${updatedUser?.role}`);
            console.log(`Verified Platform Role: ${updatedUser?.platformRole}`);
        }

    } catch (error) {
        console.error('❌ Error updating user role:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

updateUserRole();
