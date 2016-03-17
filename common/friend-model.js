/**
 * The Friend Class
 * @class Friend
 * @param {Object} document An object representing a Friend ususally a Mongo document
 */
Friend =  BaseModel.extendAndSetupCollection("friends");

/**
 * Get the User instance for the friend
 * @function user
 * @memberof Friend
 */
Friend.prototype.user = function () {
    if(this.friendId){
        return  Meteor.users.findOne(this.friendId);
    }
};


//Create the schema for a friend
Friend.appendSchema({
    "userId": {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    "friendId":{
        type:String,
        regEx:SimpleSchema.RegEx.Id
    }
});

Friend.meteorMethods({
    "insert": new ValidatedMethod({
        name: 'friends.insert',
        mixins: [CallPromiseMixin, LoggedInMixin],
        validate: new SimpleSchema({
            doc: {
                type: Object
            },
            'doc.userId': Friend.getSchemaKey('userId'),
            'doc.friendId': Friend.getSchemaKey('friendId')
        }).validator(),
        checkLoggedInError: {
            error: 'notLogged',
            message: 'You need to be logged in to call this method',//Optional
            reason: 'You need to login' //Optional
        },
        run({doc}) {
            var user = User.createEmpty(doc.userId);
            var requester = User.createEmpty(doc.friendId);
            if(user.hasRequestFrom(requester)) {
                Friend.collection.insert(doc);
                // Create a reverse record for the other user
                // so the connection happens for both users
                Friend.collection.insert({userId: doc.friendId, friendId: doc.userId});
                // Delete the request
                FriendRequest.collection.remove({requestedUserId: doc.userId, userId: doc.friendId});
            }else{
                throw new Meteor.Error("NoRequest", "User must request friendship before friendship is allowed");
            }
        }
    }),
    "remove": new ValidatedMethod({
        name: 'friends.remove',
        mixins: [CallPromiseMixin, LoggedInMixin],
        validate: new SimpleSchema({
            _id: Friend.getSchemaKey("_id")
        }).validator(),
        checkLoggedInError: {
            error: 'notLogged',
            message: 'You need to be logged in to call this method',//Optional
            reason: 'You need to login' //Optional
        },
        run({_id}) {
            var friend = Friend.collection.findOne({_id: _id});

            if (friend && friend.checkOwnership()) {
                Friend.collection.remove({_id: _id});
                //when a friend record is removed, remove the reverse record for the
                //other users so that the friend connection is terminated on both ends
                Friend.collection.remove({userId: friend.friendId, friendId: Meteor.userId()});
            }
        }
    })
});