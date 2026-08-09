import mongoose from 'mongoose';

const tourPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tour package name is required.'],
      trim: true,
      maxlength: [120, 'Tour package name cannot exceed 120 characters.'],
    },

    description: {
      type: String,
      required: [true, 'Tour package description is required.'],
      trim: true,
      maxlength: [2000, 'Tour package description cannot exceed 2000 characters.'],
    },

    location: {
      type: String,
      required: [true, 'Tour package location is required.'],
      trim: true,
      maxlength: [150, 'Tour package location cannot exceed 150 characters.'],
    },

    durationDays: {
      type: Number,
      required: [true, 'Tour duration is required.'],
      min: [1, 'Tour duration must be at least 1 day.'],
    },

    pricePerPerson: {
      type: Number,
      required: [true, 'Price per person is required.'],
      min: [0, 'Price per person cannot be negative.'],
    },

    maxGroupSize: {
      type: Number,
      required: [true, 'Maximum group size is required.'],
      min: [1, 'Maximum group size must be at least 1.'],
    },

    availableDates: {
      type: [Date],
      required: [true, 'At least one available date is required.'],
      validate: {
        validator(dates) {
          return Array.isArray(dates) && dates.length > 0;
        },
        message: 'At least one available date is required.',
      },
    },

    inclusions: {
      type: [String],
      default: [],
    },

    exclusions: {
      type: [String],
      default: [],
    },

    photos: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: {
        values: ['draft', 'active'],
        message: 'Tour package status must be draft or active.',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

const guideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Guide user ID is required.'],
      unique: true,
      index: true,
    },

    location: {
      type: String,
      required: [true, 'Guide location is required.'],
      trim: true,
      maxlength: [150, 'Guide location cannot exceed 150 characters.'],
    },

    languages: {
      type: [String],
      required: [true, 'At least one language is required.'],
      validate: {
        validator(languages) {
          return Array.isArray(languages) && languages.length > 0;
        },
        message: 'At least one language is required.',
      },
    },

    specialties: {
      type: [String],
      required: [true, 'At least one specialty is required.'],
      validate: {
        validator(specialties) {
          return Array.isArray(specialties) && specialties.length > 0;
        },
        message: 'At least one specialty is required.',
      },
    },

    bio: {
      type: String,
      required: [true, 'Guide bio is required.'],
      trim: true,
      maxlength: [1000, 'Guide bio cannot exceed 1000 characters.'],
    },

    yearsOfExperience: {
      type: Number,
      default: 0,
      min: [0, 'Years of experience cannot be negative.'],
    },

    photos: {
      type: [String],
      default: [],
    },

    tourPackages: {
      type: [tourPackageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

guideSchema.index({
  location: 1,
});

const Guide = mongoose.model('Guide', guideSchema);

export default Guide;
