//  Loading database module
const mongoose = require("mongoose");

//	Loading Coupon and User collections from database
require("../models/Coupon");
require("../models/User");

const coupons = mongoose.model("Coupons");
const users = mongoose.model("Users");

//	Exporting Coupon features
module.exports = {
  //	Return all coupons available for user on database given id user
  async index(req, res) {
    const userId = req.headers.authorization;

		if(!userId || !userId.length || !mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).send("Invalid id!");
    }
    
    if(!(await users.findById(userId).exec())) {
      return res.status(400).send("User is not found!");
    }
    
    await coupons.find({ userId: "/"+userId+"/", private: false })
    .sort({
			type: "asc",
			available: "desc",
			name: "asc",
			creationDate: "asc"
		}).then((response) => {
			if(response && response.length) {
				return res.status(200).json(response);
			} else {
				return res.status(404).send("Coupons not found!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
  },
  
  //	Create a new coupon
  async create(req, res) {
    const { name, type, private, qty, method, discount, minValue, userId } = req.body;

    var errors = [];

    if(!userId || !userId.length || !mongoose.Types.ObjectId.isValid(userId)) {
      errors.push("userId");
    }

    if(!(await users.findById(userId).exec())) {
      errors.push("userId is not found");
    }

		if(!name || !name.length) {
			errors.push("name");
    }

    if(!type || !type.length || (type != "quantidade" && 
       type != "valor" && type != "frete")) {
      errors.push("type");
    }

    if(type === "frete" && method != "dinheiro") {
        errors.push("type and method wrongs");
    }

    if(private && (!userId || !userId.length)) {
      errors.push("private and userId worngs");
    }

    if(minValue < 0) {
      errors.push("minValue");
    }

    if((type === "valor") && (minValue < 1)) {
      errors.push("type and minValue worngs");
    }

    if(qty < 0) {
      errors.push("qty");
    }

    if(!method || !method.length || (method != "dinheiro" && method != "porcentagem")) {
      errors.push("method");
    }

    if(discount < 0) {
      errors.push("discount");
    }

    if(errors.length) {
      const message = "Invalid " + errors.join(", ") + " value" + (errors.length > 1 ? "s!" : "!");

      return res.status(400).send(message);
    }

    await coupons.findOne({ name: name.trim() }).then((response) => {
			if(response) {
        return res.status(400).send("There is a coupon using this name, try another!");
      } else {
        coupons.create({
          name,
          type,
          private,
          qty,
          method,
          discount,
          minValue : (type === "valor") ? minValue : 0,
          userId: userId ? userId : []
        }).then((response) => {
          if(response) {
            return res.status(201).send("Coupon created successfully!");
          } else {
            return res.status(400).send("We couldn't create a new coupon, try again later!");
          }
        }).catch((error) => {
          return res.status(500).send(error);	
        });
      }
    }).catch((error) => {
      return res.status(500).send(error);
		});
  },
  
  //	Update a specific coupon
  async update(req, res) {
    const couponId = req.params.id;
    const { name, type, qty, method, discount, available, userId } = req.body;

    if(!couponId || !couponId.length || !mongoose.Types.ObjectId.isValid(couponId)) {
			return res.status(400).send("Invalid id!");
		}

    var errors = [];

		if(!name || !name.length) {
			errors.push("name");
    }

    if(!type || !type.length || (type != "quantidade" && 
      type != "privado" && type != "valor" && type != "frete")) {
      errors.push("type");
    }
    
    if(type === "privado") {
      
      if(!userId || !userId.length) {
        errors.push("userId");
      }

      if(userId.length != qty) {
        errors.push("userId and qty wrongs");
      }

      for(var id of userId) {
        if(!id || !id.length || !mongoose.Types.ObjectId.isValid(id)) {
          errors.push("userId");
          break;
        }

        if(!(await users.findById(id).exec())) {
          errors.push("userId is not found");
          break;
        }
      }
    } else if(type === "frete" && method != "dinheiro") {
      errors.push("type and method wrongs");
    }

    await coupons.findOne({ name: name.trim() }).then((response) => {
			if(response && (response._id != couponId)) {
        return res.status(400).send("There is a coupon using this name, try another!");
      } else {
        if(qty < 0) {
          errors.push("qty");
        }

        if(!method || !method.length || (method != "dinheiro" && method != "porcentagem")) {
          errors.push("method");
        }

        if(discount < 0) {
          errors.push("discount");
        }

        if(errors.length) {
          const message = "Invalid " + errors.join(", ") + " value" + (errors.length > 1 ? "s!" : "!");

          return res.status(400).send(message);
        }

        coupons.findById(couponId).then((coupon) => {
          if(coupon) {
            coupon.name = name;
            coupon.type = type;
            coupon.qty = qty;
            coupon.method = method;
            coupon.discount = discount;
            coupon.available = available;
            coupon.userId = (type === "privado") ? userId : [];
            
            coupon.save().then((response) => {
              if(response) {
                return res.status(200).send("Successful on changing your data!");
              } else {
                return res.status(400).send("We couldn't save your changes, try again later!");
              }
            }).catch((error) => {
              return res.status(500).send(error);
            });
          } else {
            return res.status(404).send("Coupon not found!" );
          }
        }).catch((error) => {
          return res.status(500).send(error);
        });
      }
    }).catch((error) => {
      return res.status(500).send(error);
		});
  },

  //	Update a specific coupon of user
  async updateUser(req, res) {
    const couponId = req.params.id;
    const userId = req.headers.authorization;
    const { private } = req.body;

    if(!couponId || !couponId.length || !mongoose.Types.ObjectId.isValid(couponId)) {
			return res.status(400).send("Invalid id!");
		}

    if(!userId || !userId.length || !mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).send("Invalid userId!");
    }

    coupons.findById(couponId).then((coupon) => {
      if(coupon) {
        if(!coupon.available) {
          return res.status(400).send("Coupon is not available!");
        }

        if((coupon.type == "privado") && !private) {
          return res.status(400).send("Coupon invalid!");
        } else if((coupon.type != "privado") && private) {
          return res.status(400).send("Coupon invalid!");
        }

        coupon.qty = (coupon.qty > 0) ? (coupon.qty - 1) : 0;
        coupon.available = (coupon.qty === 0) ? false : true;
        
        var data = [];
        
        if(private) { 
          for(var c of coupon.userId) {
            if(c != userId ) {
              data.push(c);
            }
          }

          coupon.userId = data;
        }
        
        coupon.save().then((response) => {
          if(response) {
            return res.status(200).send("Successful on changing your data!");
          } else {
            return res.status(400).send("We couldn't save your changes, try again later!");
          }
        }).catch((error) => {
          return res.status(500).send(error);
        });
      } else {
        return res.status(404).send("Coupon not found!" );
      }
    }).catch((error) => {
      return res.status(500).send(error);
    });
  },
  
  //	Delete a specific coupon
  async delete(req, res) {
    const couponId = req.params.id;

		if(!couponId || !couponId.length || !mongoose.Types.ObjectId.isValid(couponId)) {
			return res.status(400).send("Invalid id!");
		}

		await coupons.findByIdAndDelete(couponId).then((response) => {
			if(response) {
        return res.status(200).send("The coupon have been deleted!");
			} else {
				return res.status(404).send("Coupon not found!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
  },
  
  //	Return all coupons coupons
	async all(req, res) {
    await coupons.find().sort({
			type: "asc",
			available: "desc",
			name: "asc",
			creationDate: "asc"
		}).then((response) => {
			if(response && response.length) {
				return res.status(200).json(response);
			} else {
				return res.status(404).send("Coupons not found!");
			}
		}).catch((error) => {
			return res.status(500).send(error);
		});
  }
};