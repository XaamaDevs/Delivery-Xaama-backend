//  Requiring database
const mongoose = require("mongoose");

//	Using schema feature from mongoose
const Schema = mongoose.Schema;

//	Defining User schema
const userSchema = Schema({
	name: {
		type: String,
		require: true
	},
	email: {
		type: String,
		require: true
	},
	password: {
		type: String,
		require: true
	},
	creationDate: {
		type: Date,
		default: Date.now()
	}
});

//	Creating collection Usuarios on database
mongoose.model("Usuarios", userSchema);

const test = 'github';