const colors = ["#ff6666", "#ffbd55", "#ffff66", "#9de24f", "#87cef0"];
let offset = 0;
export const funnyLog = msg => {
    //split message into chunks of 2
    const parts = msg.match(/.{1,2}/g);
    //give each part a different color
    const styledMessage = parts.map((str, index) => {
        return {
            str,
            style: {
                color: colors[(index+offset) % colors.length],
                fontWeight: "bold"
            }
        };
    });
    //make the rainbow move left with each message
    offset++

    //finally, we send the message to everyone
    api.broadcastMessage(styledMessage);
}