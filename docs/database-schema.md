# Ghuraghuri Database Schema

The project will use MongoDB as its database and Mongoose as the Object Data Modeling library.

The detailed fields and relationships will be finalized before implementing each model.

## Common Workflow Models

### User

Stores the account information for travelers, hotel vendors, guides, and administrators.

Possible information includes:

- Name
- Email
- Phone number
- Password
- User role
- Account status
- Profile image
- Creation date

### VendorApplication

Stores registration and verification information submitted by hotel vendors and guides.

Possible information includes:

- Applicant
- Application type
- Business or professional details
- Location
- Verification documents
- Approval status
- Admin feedback
- Submission date

## Module 1 Models

### Trip

Stores trips created by travelers.

Possible information includes:

- Trip owner
- Trip name
- Destination
- Start date
- End date
- Cover photo
- Number of places
- Creation date

### Hotel

Stores hotel listings created by approved hotel vendors.

Possible information includes:

- Hotel vendor
- Hotel name
- Location
- Description
- Photos
- Amenities
- Room types
- Price per night
- Listing status

### Guide

Stores the public profile of an approved tour guide.

Possible information includes:

- User account
- Location
- Languages spoken
- Specialties
- Biography
- Photos
- Approval status

### TourPackage

Stores tour packages created by guides.

Possible information includes:

- Guide
- Package name
- Description
- Duration
- Price per person
- Maximum group size
- Availability

### PublicRoom

Stores public travel rooms created by travelers.

Possible information includes:

- Room creator
- Destination
- Travel dates
- Estimated budget
- Maximum members
- Description
- Interest tags
- Current members
- Room status

## Planned Relationships

- A user can create multiple trips.
- A hotel vendor can manage one or more hotel listings.
- A guide can create multiple tour packages.
- A traveler can create multiple public rooms.
- A public room can contain multiple travelers.
- A vendor application belongs to one user.
