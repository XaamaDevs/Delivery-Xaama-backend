//  Loading database module
const mongoose = require("mongoose");

//	Loading Orders and Company collections from database
require("../models/Order");
require("../models/Company");
require("../models/User");
const orders = mongoose.model("Orders");
const companyData = mongoose.model("Company");
const users = mongoose.model("Users");

//	Exporting Order features
module.exports = {
	//	Return an order on database given id
	async index(req, res) {
		const userId = req.params.id;

		if(!userId || !userId.length) {
			return res.status(400).send("No user is logged in!");
		}
		
		await orders.find({ "user._id": userId }).then((response) => {
			if(response && response.length) {
				return res.status(200).json(response);
			} else {
				return res.status(400).send("Orders not found!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
	},

	//	Create a new order
	async create(req, res) {
		const { user, products, deliver, address } = req.body;

		if(!user || !products) {
			return res.status(400).send("User or products are empty!");
    }
    
    if(deliver == null) {
      return res.status(400).send("Delivery are empty or wrong!");
    }

    if(deliver && !(address.length)){
      return res.status(400).send("The shipping address is empty!");
    }

		//	Get freight price and add if deliver is true
		var total = await companyData.findOne({}).exec();
		total = (deliver) ? total.freight : 0.0;

		//	Calculate products and its additions total price
		for(var x of products) {
			for(var y of x.additions) {
				if(x.size >= 0 && x.size < x.product.prices.length) {
					total += (x.product.prices[x.size] + y.price);
				} else {
					return res.status(400).send(`${x.product.name} size doesn't exist!`);
				}
			}
		}

		await orders.create({
			user,
			products,
      total,
      deliver,
      address: address.length ? (address.split(",").map(a => a.trim())) : null
		}).then((response) => {
			if(response) {
				return res.status(201).send("Order created successfully!");
			} else {
				return res.status(400).send("We couldn't create a new order, try again later!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
  },
  
  //	Update current order status
	async update(req, res) {
    const orderId = req.params.id;
		const userId = req.headers.authorization;
    const { status, feedback } = req.body;

		if(!userId || !userId.length) {
			return res.status(400).send("No user is logged in!");
    }

    if(!orderId || !orderId.length) {
			return res.status(400).send("No order received!");
    }
    
    if(typeof status != "boolean") {
      return res.status(400).send("Status is empty!");
    }
		
    await orders.findById(orderId).then((order) => {
      if(order) {
        
        order.status = status;
        order.feedback = feedback ? feedback.trim() : null ;

        order.save().then((response) => {
          if(response) {
            return res.status(202).send("Successful on changing your data!");
          } else {
            return res.status(400).send("We couldn't save your changes, try again later!");
          }
        }).catch((error) => {
          return res.status(500).send(error);
        });
      } else {
        return res.status(400).send("User not found!");
      }
    }).catch((error) => {
      return res.status(500).send(error);
    });
	},

	//	Delete all orders
	async delete(req, res) {

    await orders.deleteMany().then((response) => {
      if(response.n) {
        return res.status(200).send("All orders has been deleted!");
      } else {
        return res.status(400).send("Orders not found!");
      }
    }).catch((error) => {
      return res.status(500).send(error);
    });
  
	},
	
	//	Return all orders
	async all(req, res) {
		await orders.find().sort({
      status: "asc",
			creationDate: "desc" 
		}).then((response) => {
			if(response && response.length ) {
				return res.status(200).json(response);
			} else {
				return res.status(400).send("Orders not found!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
	}
};