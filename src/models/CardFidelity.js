//  Loading database module
const mongoose = require("mongoose");

//	Using schema feature from mongoose and calling schemas
const Schema = mongoose.Schema;

//	Defining Card Fidelity schema
const cardFidelitySchema = Schema({
	type: {
		type: String,
		required: true
	},
	available: {
		type: Boolean,
		default: 0,
    required: true
  },
	qtdMax: {
		type: Number,
    default: 10,
    required: true
	},
	creationDate: {
		type: Date,
		default: Date.now()
	}
});

//	Creating collection CardsFidelity on database
mongoose.model("CardsFidelity", cardFidelitySchema);