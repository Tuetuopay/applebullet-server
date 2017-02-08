const PushBullet = require("pushbullet"), apn = require("apn");
var pusher = new PushBullet(process.env.PUSHBULLET_STREAM);

var stream = pusher.stream();
var apnProvider = new apn.Provider({
	key: 'conf/apns.key',
	cert: 'conf/apns.crt',
	production: false,
	gateway: "gateway.sandbox.push.apple.com"
});

var base64ToBuffer = (typeof Buffer.from === 'function')
	? function(s) { return Buffer.from(s, 'base64'); }
	: function(s) { return new Buffer(s, 'base64'); };

const myPhone = base64ToBuffer(process.env.PUSH_TOKEN).toString("hex");

stream.on('connect', () => {
	console.log("Connected to PushBullet stream");
});

var relayedPushes = [];
// The real meat
stream.on("tickle", tickle => {
	if (tickle == 'push') {
		// Get latest push
		pusher.history({limit: 1}, (err, res) => {
			if (err) return console.log(err);
			var push = res.pushes[0];
			if (relayedPushes.indexOf(push.iden) < 0) {
				relayedPushes.push(push.iden);
				console.log((push.title ? push.title + ": " : "") + push.body);

				// Create push notification
				var notification = new apn.Notification();
				notification.title = push.title || "PushBullet";
				notification.body = push.body.slice(0, 1024);
				notification.sound = "default";
				notification.topic = process.env.APP_ID;
				notification.priority = 10;
				apnProvider.send(notification, myPhone).then(res => {
					console.log(res);
				});
			}
		});
	}
	console.log("Tickle: ", tickle);
});

stream.connect();

// Prevent exit
(function wait() {
	setTimeout(wait, 1000);
})();

