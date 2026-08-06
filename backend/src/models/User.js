import mongoose from 'mongoose';

// These arrays define the only values that are allowed for the related fields.
// Keeping them in one place reduces spelling mistakes throughout this model.
const USER_ROLES = ['traveler', 'hotel', 'guide', 'admin'];
const ACCOUNT_STATUSES = ['active', 'suspended', 'disabled'];
const APPROVAL_STATUSES = ['not_required', 'pending', 'approved', 'rejected'];

// A Mongoose schema is the blueprint for documents stored in MongoDB.
// In this case, every document in the "users" collection must follow this shape.
const userSchema = new mongoose.Schema(
  {
    // The user's visible name, for example "Fahim Shahriar Rafi".
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must contain at least 2 characters.'],
      maxlength: [80, 'Name cannot contain more than 80 characters.'],
    },

    // Email is used as the main login identifier.
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [120, 'Email cannot contain more than 120 characters.'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address.'],
    },

    // The requirement document asks users to provide a phone number during registration.
    // We keep the rule broad enough to support Bangladeshi and international formats.
    phone: {
      type: String,
      required: [true, 'Phone number is required.'],
      trim: true,
      minlength: [7, 'Phone number must contain at least 7 characters.'],
      maxlength: [20, 'Phone number cannot contain more than 20 characters.'],
    },

    // We never store the original password.
    // Later, the registration service will convert the password into a secure hash
    // and store only that hash in this field.
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required.'],

      // "select: false" means normal database queries will not return this field.
      // The login service must explicitly request it when checking a password.
      select: false,
    },

    // The role controls which parts of the website the user may access.
    role: {
      type: String,
      enum: {
        values: USER_ROLES,
        message: '`{VALUE}` is not a supported user role.',
      },
      default: 'traveler',
    },

    // Account status is used for general account control.
    // For example, an administrator could suspend an account without deleting it.
    accountStatus: {
      type: String,
      enum: {
        values: ACCOUNT_STATUSES,
        message: '`{VALUE}` is not a supported account status.',
      },
      default: 'active',
    },

    // Hotels and guides require administrator approval before becoming publicly usable.
    // Travelers and administrators do not need that approval workflow.
    approvalStatus: {
      type: String,
      enum: {
        values: APPROVAL_STATUSES,
        message: '`{VALUE}` is not a supported approval status.',
      },
      default: function getDefaultApprovalStatus() {
        const rolesRequiringApproval = ['hotel', 'guide'];

        return rolesRequiringApproval.includes(this.role) ? 'pending' : 'not_required';
      },
    },

    // This is optional for the first authentication version.
    // Later, it can store the URL of the user's uploaded profile image.
    profileImageUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    // Mongoose automatically adds createdAt and updatedAt fields.
    timestamps: true,

    // This controls how a user document is converted into JSON for an API response.
    toJSON: {
      transform: (_document, returnedObject) => {
        // This is a second safety layer. Even when passwordHash was explicitly selected,
        // it should not be sent back to the browser in a JSON response.
        delete returnedObject.passwordHash;

        // __v is an internal Mongoose version field that API users do not need to see.
        delete returnedObject.__v;

        return returnedObject;
      },
    },
  }
);

// A model gives us methods such as User.create(), User.findOne(), and User.findById().
// Mongoose will use the model name "User" and create/use the MongoDB collection "users".
const User = mongoose.model('User', userSchema);

export default User;