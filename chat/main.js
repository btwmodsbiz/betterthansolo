(function(){
	"use strict";
	
	var params = location.search.substring(1).split("/", 3);
	var host = 'ws://' + params[0] + '/user/' + params[1] + '/' + params[2];
	// Example host: ws://server.betterthansolo.com:8585/user/AndreM/abf527e

	if (!Modernizr.websockets)
		return;

	var View = Backbone.View.extend({
		template: function() {},
		serialize: function() {
			return {};
		},
		render: function() {
			this.$el.html(this.template(this.serialize()));
			return this;
		}
	});
	
	var ChatLogView = View.extend({
		className: 'chatlog',
		scrolledToBottom: false,
		initialize: function() {
			var self = this;
			$(window).scroll(function() {
				self.checkScrollBottom();
			});
			$(window).resize(function() {
				if (self.scrolledToBottom)
					$(window).scrollTop($(document).height());

				self.checkScrollBottom();
			});
			this.checkScrollBottom();

			(new (View.extend({
				className: 'scrollwarning',
				template: _.template('<i class="icon-arrow-down icon-white"></i> Scroll Down for More Chat <i class="icon-arrow-down icon-white"></i>')
			}))).render().$el.appendTo('body');
		},
		checkScrollBottom: function() {
			this.scrolledToBottom = $(window).scrollTop() + $(window).height() == $(document).height();
			console.log('checkScrollBottom', this.scrolledToBottom);
			$('body')[this.scrolledToBottom ? 'addClass' : 'removeClass']('scrolled-to-bottom');
		}
	});

	var userList = new Backbone.Collection();

	var MessageView = View.extend({
		className: 'message',
		serialize: function() {
			return {};
		},
		render: function() {
			this.$el.html(this.template(this.serialize()));
			return this;
		}
	});

	var MessageViewConsole = MessageView.extend({
		template: _.template('<% _.each(messages, function(message, i){ if (i > 0) {%><br><%} %><%-message%><% }); %>'),
		serialize: function() {
			return {
				messages: this.model.get('message').split('\n')
			};
		}
	});

	var MessageViewUser = MessageView.extend({
		serialize: function() {
			var model = this.model;
			return _.defaults({
				username: model.get('username'),
				gateway: model.get('gateway'),
				color: model.get('color'),
				alias: model.get('alias')
			}, MessageView.prototype.serialize.apply(this, arguments));
		}
	});

	var MessageViewConnect = MessageViewUser.extend({
		template: _.template('<%-alias || username%> joined chat<%- _.isString(gateway) && gateway.length > 0 ? " on " + gateway : "" %>.'),
		initialize: function() {
			this.$el.css('color', '#FFFF55');
		}
	});

	var MessageViewDisconnect = MessageViewConnect.extend({
		template: _.template('<%-alias || username%> left chat<%- _.isString(gateway) && gateway.length > 0 ? " on " + gateway : "" %><%-_.isString(reason) && reason.length > 0 ? " (" + reason + ")" : ""%>.'),
		serialize: function() {
			var model = this.model;
			return _.defaults({
				reason: model.get('reason')
			}, MessageViewConnect.prototype.serialize.apply(this, arguments));
		}
	});

	var MessageViewChat = MessageViewUser.extend({
		template: _.template('&lt;<span class="chatcolor <%-color ? "chatcolor-" + color : ""%>"><%-alias || username%></span>&gt; <%-message%>'),
		serialize: function() {
			var model = this.model;
			return _.defaults({
				message: model.get('message')
			}, MessageViewUser.prototype.serialize.apply(this, arguments));
		}
	});

	var MessageViewEmote = MessageViewChat.extend({
		template: _.template('* <span class="chatcolor <%-color ? "chatcolor-" + color : ""%>"><%-alias || username%></span> <%-message%>')
	});

	var MessageViewDeath = MessageViewChat.extend({
		template: _.template('<%-message%>')
	});
	
	var Message = Backbone.Model.extend({
		getView: function() {
			return false;
		},
		handleMessage: function(chatLogView) {
			var wasScrolledToBottom = chatLogView.scrolledToBottom,
				view = this.getView();
console.log('messagehandlemessage', wasScrolledToBottom);
			if (view) {
				view.render().$el.appendTo(chatLogView.$el);

				if (wasScrolledToBottom)
					$(window).scrollTop($(document).height());
			}
		}
	}, {
		build: function(json) {
			if (json.type && _.has(Message.types, json.type)) {
				return new Message.types[json.type](json);
			}
			throw "No handler for message type '" + json.type + "'";
		},
		types: {
			
		}
	});

	Message.types['connect'] = Message.extend({
		handleMessage: function() {
			Message.prototype.handleMessage.apply(this, arguments);
			userList.add(new UserInfo(this.attributes));
		},
		getView: function() {
			return new MessageViewConnect({ model: this });
		}
	});

	Message.types['disconnect'] = Message.extend({
		handleMessage: function() {
			Message.prototype.handleMessage.apply(this, arguments);
			var userInfo = userList.get((this.get('gateway') || '') + '/' + this.get('username'));
			if (userInfo)
				userList.remove(userInfo);
		},
		getView: function() {
			return new MessageViewDisconnect({ model: this });
		}
	});

	Message.types['chat'] = Message.extend({
		getView: function() {
			return new MessageViewChat({ model: this });
		}
	});

	Message.types['emote'] = Message.extend({
		getView: function() {
			return new MessageViewEmote({ model: this });
		}
	});

	Message.types['death'] = Message.extend({
		getView: function() {
			return new MessageViewDeath({ model: this });
		}
	});
	
	var UserListView = View.extend({
		events: {
			'click': '_onClick'
		},
		className: 'userlist',
		template: _.template('<div><% users.each(function(user) { %><div><%-user.get("alias") || user.get("username")%><%- user.get("gateway") ? " (" + user.get("gateway") + ")" : "" %></div><% }); %></div>'),
		serialize: function() {
			return {
				users: this.collection
			};
		},
		initialize: function() {
			this.listenTo(this.collection, "add", this.render);
			this.listenTo(this.collection, "remove", this.render);
			this.listenTo(this.collection, "change", this.render);
		},
		_onClick: function() {
			this.$el.toggleClass('opened');
		}
	});
	
	var UserInfo = Backbone.Model.extend({
		constructor: function(attributes) {
			attributes = _.pick(attributes || {}, [ 'gateway', 'username', 'alias', 'color' ]);
			Backbone.Model.apply(this, [ attributes ].concat(Array.prototype.slice(arguments, 1)));
		},
		initialize: function() {
			this.id = (this.get('gateway') || '') + '/' + this.get('username');
		},
		defaults: {
			gateway: null,
			alias: null,
			color: null
		}
	});
	
	new UserListView({
		collection: userList
	}).render().$el.appendTo('body');

	Message.types['userlist'] = Message.extend({
		handleMessage: function(chatLogView) {
			_.each(this.get('users'), function(user){
				userList.add(new UserInfo(user));
			}, this);
		}
	});

	Message.types['gatewayconnect'] = Message.extend({
		handleMessage: function() {
			var users = this.get('users');
			
			_.each(users, function(user){
				userList.add(new UserInfo(user));
			}, this);

			var len = users.length,
				message = 'Server ' + this.get('gateway') + ' connected' + (len > 0 ? ' making ' + len + ' user' + (len == 1 ? '' : 's') + ' available for chat' : '') + '.';

			new MessageViewConsole({ model: new Message({ message: message }) })
				.render()
				.$el.css('color', '#FFFF55').appendTo(chatLogView.$el);
		}
	});

	Message.types['gatewaydisconnect'] = Message.extend({
		handleMessage: function() {
			var users = this.get('users');
			_.each(users, function(user){
				var userInfo = userList.get((user.gateway || '') + '/' + user.username);
				if (userInfo)
					userList.remove(userInfo);
			}, this);

			var len = users.length,
				message = 'Server ' + this.get('gateway') + ' disconnected'
					+ (len > 0 ? ' making ' + len + ' user' + (len == 1 ? '' : 's') + ' no longer available for chat' : '')
					+ '.';

			new MessageViewConsole({ model: new Message({ message: message }) })
				.render()
				.$el.css('color', '#FFFF55').appendTo(chatLogView.$el);
		}
	});

	var chatLogView = new ChatLogView();
	chatLogView.render().$el.appendTo('body');

	var connected = false;
	var connection;

	Message.types['ping'] = Message.extend({
		idAttribute: '_id',
		handleMessage: function() {
			connection.send(JSON.stringify({
				type: 'pong',
				id: this.attributes.id
			}));
		}
	});
	
	try {
		connection = new WebSocket(host);
	}
	catch (e) {
		new MessageViewConsole({ model: new Message({ message: "WebSocket Connection Error: " + e }) })
			.render()
			.$el.css('color', '#FF6969').appendTo(chatLogView.$el);

		return;
	}
	
	var InputView = View.extend({
		events: {
			'submit': '_onSubmit',
			'keydown input': '_onKeyDown',
			'keyup input': '_onChange',
			'change input': '_onChange',
			'focusin input': '_onFocusIn',
			'focusout input': '_onFocusOut'
		},
		className: 'textinput',
		tagName: 'form',
		template: _.template('<input type="text" maxlength="100">'),
		_onSubmit: function() {
			var input = this.$el.find('>input'),
				oldVal = input.val();
			
			input.val('');
			if (oldVal)
			this.trigger('submitmessage', oldVal);
			return false;
		},
		_onKeyDown: function(evt) {
			if (evt.which === 27)
				this.$el.find('>input').val('');
		},
		_onChange: function() {
			var val = this.$el.find('>input').val();
			this.$el[_.isEmpty(val) ? 'removeClass' : 'addClass']('hasinput');
		},
		_onFocusIn: function() {
			this.$el.addClass('focused');
		},
		_onFocusOut: function() {
			this.$el.removeClass('focused');
		}
	});
	var inputView = new InputView();
	inputView.on('submitmessage', function(message) {
		if (_.isString(message) && connection.readyState === WebSocket.OPEN) {
			message = message.replace(/^\s+|\s+$/g, '');
			if (message.indexOf('/') === 0) {
				var commandName = message.split(' ')[0].substring(1);
				message = message.substring(commandName.length + 1).replace(/^\s+|\s+$/g, '');
				switch (commandName) {
					case 'me':
					case 'em':
						connection.send(JSON.stringify({
							type: 'emote',
							message: message,
							username: ''
						}));
						break;
					default:
						new MessageViewConsole({ model: new Message({ message: "Unknown command: " + message.split(' ')[0] }) })
							.render()
							.$el.css('color', '#FF6969').appendTo(chatLogView.$el);
				}

				$(window).scrollTop($(document).height());
			}
			else {
				connection.send(JSON.stringify({
					type: 'chat',
					message: message,
					username: ''
				}));
			}
		}		
	});
	inputView.render().$el.appendTo('body');

	connection.onopen = function(){
		connected = true;
		console.log('open', arguments);
		new MessageViewConsole({ model: new Message({ message: "Connected to chat server." }) })
			.render()
			.$el.css('color', '#FFFF55').appendTo(chatLogView.$el);
	};

	connection.onclose = function(evt){
		console.log('close', arguments);
		var message = "Disconnected from the chat server" + (_.isEmpty(evt.reason) ? '' : ' (' + evt.reason + ')') + ".";
		
		if (!connected)
			message = "Failed to connect to the chat server.";
		else if (evt.code === 1006)
			message = "Disconnected from the chat server abnormally.";
		
		new MessageViewConsole({ model: new Message({ message: message }) })
			.render()
			.$el.css('color', '#FFFF55').appendTo(chatLogView.$el);
	};

	connection.onerror = function(error){
		console.log('error', arguments);
		new MessageViewConsole({ model: new Message({ message: "WebSocket Error: " + error }) })
			.render()
			.$el.css('color', '#FF6969').appendTo(chatLogView.$el);
	};

	connection.onmessage = function(evt){
		try {
			console.log('onmessage', evt.data);

			var json = JSON.parse(evt.data),
				messageModel = Message.build(json);
	
			if (messageModel) {
				console.log('bef', chatLogView.scrolledToBottom)
				messageModel.handleMessage(chatLogView);
				console.log('aft', chatLogView.scrolledToBottom)
			}
		}
		catch (e) {
			console.log("onmessage exception", e, e.getStack);
			new MessageViewConsole({ model: new Message({ message: "Error handling message: " + (e.stack ? e.stack : e.toString()) }) })
				.render()
				.$el.css('color', '#FF6969').appendTo(chatLogView.$el);
		}
	};
	
})();