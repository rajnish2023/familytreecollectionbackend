const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  dateOfBirth: { type: Date, required: true },
  placeOfBirth: { type: String, required: true },
  currentAddress: { type: String },
  contactNumber: { type: String },
  countryCode: { type: String, default: '+91' },
  email: { type: String, unique: false, sparse: true }, // optional field
  occupation: { type: String },
  photo: { type: String }, // URL or path
  familyId: { type: String, required: true }, // Family identifier

  // Relationships (References to other Person documents)
  parent_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Person' }],
  children_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Person' }],
  spouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Person' },

}, {
  timestamps: true
});

const Person = mongoose.model('Person', personSchema);
module.exports = Person;



// OR

/*
const mongoose = require('mongoose');

const personPhoto = {
  type: String, // Can be a URL or file path
  required: false
};

// Reusable schema for relatives
const basicPersonSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: false },
  dateOfBirth: { type: Date, required: true },
  placeOfBirth: { type: String, required: true },
  occupation: { type: String },
  maritalStatus: { type: String },
  currentAddress: { type: String },
  photo: personPhoto
}, { _id: false });

// Grandchildren schema
const grandChildSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  placeOfBirth: { type: String, required: true },
  childOf: { type: String, required: true }, // Reference to parent child name
  photo: personPhoto
}, { _id: false });

// Daughter's Side / In-Laws
const sonInLawSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  placeOfBirth: { type: String, required: true },
  occupation: { type: String },
  dateOfMarriage: { type: Date },
  address: { type: String }
}, { _id: false });

// Spouse schema
const spouseSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  maidenName: { type: String },
  dateOfBirth: { type: Date, required: true },
  dateOfMarriage: { type: Date },
  placeOfBirth: { type: String, required: true },
  photo: personPhoto
}, { _id: false });

// Parent schema
const parentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  placeOfBirth: { type: String, required: true },
  occupation: { type: String },
  photo: personPhoto
}, { _id: false });

// Ancestral schema
const ancestorSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  gender: { type: String },
  dateOfBirth: { type: Date, required: true },
  placeOfBirth: { type: String, required: true },
  relationToClient: { type: String, required: true },
  photo: personPhoto
}, { _id: false });

const personSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  placeOfBirth: { type: String, required: true },
  currentAddress: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true },
  occupation: { type: String },
  photo: personPhoto,

  spouse: spouseSchema,

  parents: {
    father: parentSchema,
    mother: parentSchema,
    marriageDate: { type: Date }
  },

  siblings: [basicPersonSchema],

  children: [basicPersonSchema],

  inLaws: [sonInLawSchema],

  grandchildren: [grandChildSchema],

  ancestors: [ancestorSchema]

}, {
  timestamps: true
});

const Person = mongoose.model('Person', personSchema);
module.exports = Person;

*/