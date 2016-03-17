/**
 * The FriendRequest Class
 * @class FriendRequest
 * @param {Object} document An object representing a request, usually a Mongo document
 */
FriendRequest = BaseModel.extendAndSetupCollection("friendRequests", {
    userId: true
});

/**
 * Get the User instance for the user who made the request
 * @returns {User} The user who made the request
 */
FriendRequest.prototype.requester = function () {
    return Meteor.users.findOne({_id: this.userId});
};

/**
 * Get the User instance for the user who is recieving the request
 * @returns {User} The user who recieved the request
 */
FriendRequest.prototype.user = function () {
    return Meteor.users.findOne(this.userId);
};

/**
 * Accept the friend request
 * @method approve
 */
FriendRequest.prototype.accept = function () {
    new Friend({userId: this.requestedUserId, friendId: this.userId}).save();
};

/**
 * Deny the friend request
 * @method deny
 */
FriendRequest.prototype.deny = function () {
    //this.update({$set:{denied:new Date()}});
    this.remove();
};

/**
 * Ignore the friend request so that it can be accepted or denied later
 * @method ignore
 */
FriendRequest.prototype.ignore = function () {
    this.update({$set: {ignored: new Date()}});
};

/**
 * Cancel the friend request
 * @method cancel
 */
FriendRequest.prototype.cancel = function () {
    this.remove();
};

/**
 * Check if the request had been denied
 * @returns {Boolean} Whether the request has been denied
 */
FriendRequest.prototype.wasRespondedTo = function () {
    return !!this.denied || !!this.ignored;
};

//Create the schema for a friend
FriendRequest.appendSchema({
    "requestedUserId": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        denyUpdate: true
    },
    "denied": {
        type: Date,
        optional: true
    },
    "ignored": {
        type: Date,
        optional: true
    }
});

FriendRequest.meteorMethods({
    "insert": new ValidatedMethod({
        name: 'friendRequests.insert',
        mixins: [CallPromiseMixin, LoggedInMixin],
        validate: new SimpleSchema({
            doc: {
                type: Object
            },
            'doc.userId': FriendRequest.getSchemaKey('userId'),
            'doc.requestedUserId': FriendRequest.getSchemaKey('requestedUserId')
        }).validator(),
        checkLoggedInError: {
            error: 'notLogged',
            message: 'You need to be logged in to call this method',//Optional
            reason: 'You need to login' //Optional
        },
        run({doc}) {
            console.log(doc);
            var user = Meteor.users.findOne({_id: doc.userId});
            var requestedUser = Meteor.users.findOne({_id: doc.requestedUserId});

            if (requestedUser._id !== this.userId && !requestedUser.isFriendsWith(user)) {
                //if(!(requestedUser.blocksUser(user) || user.blocksUserById(user))){
                if (!(user.hasRequestFrom(requestedUser) || requestedUser.hasRequestFrom(user))) {
                    FriendRequest.collection.insert(doc);
                } else {
                    throw new Meteor.Error("RequestExists", "A request between users already exists");
                }
                //}else{
                //    throw new Meteor.Error("Blocked", "One user is blocking the other");
                //}
            } else {
                throw new Meteor.Error("RelationshipExists", "Either the user is requesting themselves or they are already friends with this user");
            }
        }
    }),
    "update": new ValidatedMethod({
        name: 'friendRequests.update',
        mixins: [CallPromiseMixin, LoggedInMixin],
        validate: new SimpleSchema({
            _id: FriendRequest.getSchemaKey("_id"),
            doc: {
                type: Object
            },
            'doc.denied': FriendRequest.getSchemaKey('denied'),
            'doc.ignored': FriendRequest.getSchemaKey('ignored')
        }).validator(),
        checkLoggedInError: {
            error: 'notLogged',
            message: 'You need to be logged in to call this method',//Optional
            reason: 'You need to login' //Optional
        },
        run({_id, doc}) {
            var request = FriendRequest.collection.findOne({_id: _id});
            //let the update happen if the request belongs to the user. simple-schema takes
            //care of making sure that they can't change fields they aren't supposed to
            if (request && request.checkOwnership()) {
                FriendRequest.collection.update({_id: _id}, doc);
            }
        }
    }),
    "remove": new ValidatedMethod({
        name: 'friendRequests.remove',
        mixins: [CallPromiseMixin, LoggedInMixin],
        validate: new SimpleSchema({
            _id: FriendRequest.getSchemaKey("_id")
        }).validator(),
        checkLoggedInError: {
            error: 'notLogged',
            message: 'You need to be logged in to call this method',//Optional
            reason: 'You need to login' //Optional
        },
        run({_id}) {
            var request = FriendRequest.collection.findOne({_id: _id});
            //allow the request to be canceled if the currentUser is the requester
            //and the other user has not denied the request
            if ((request.userId === Meteor.userId() || request.requestedUserId === Meteor.userId()) && !request.wasRespondedTo()) {
                FriendRequest.collection.remove({_id: _id});
            }
        }
    })
});