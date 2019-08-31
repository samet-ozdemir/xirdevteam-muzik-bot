/*

__   __ _ ______     ______                     _                             _____                         
\ \ / /(_)| ___ \    |  _  \                   | |                           |_   _|                        
 \ V /  _ | |_/ /    | | | |  ___ __   __  ___ | |  ___   _ __    ___  _ __    | |    ___   __ _  _ __ ___  
 /   \ | ||    /     | | | | / _ \\ \ / / / _ \| | / _ \ | '_ \  / _ \| '__|   | |   / _ \ / _` || '_ ` _ \ 
/ /^\ \| || |\ \     | |/ / |  __/ \ V / |  __/| || (_) || |_) ||  __/| |      | |  |  __/| (_| || | | | | |
\/   \/|_|\_| \_|    |___/   \___|  \_/   \___||_| \___/ | .__/  \___||_|      \_/   \___| \__,_||_| |_| |_|
                                                         | |                                                
                                                         |_|                                                

*/
const Discord = require('discord.js');
const client = new Discord.Client();
const ayarlar = require('./ayarlar.json');
const chalk = require('chalk');
const moment = require('moment');
var Jimp = require('jimp');
const { Client, Util } = require('discord.js');
const fs = require('fs');
const db = require('quick.db');
const http = require('http');
const express = require('express');
require('./util/eventloader.js')(client);
const YouTube = require('simple-youtube-api');
const getYoutubeID = require('get-youtube-id');
const ytdl = require('ytdl-core');
const fetchVideoInfo = require('youtube-info');
const youtube = new YouTube(" "); //Bu Kısmı Google dan aldığınız Youtube data api v3 ile değiştirin
const request = require('request');
const queue = new Map();


const app = express();
app.get("/", (request, response) => {
  console.log(Date.now() + " Ping tamamdır.");
  response.sendStatus(200);
});
app.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);

var prefix = ayarlar.prefix;


const log = message => {
    console.log(`${message}`);
    console.log(`_________________________________`);
};

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
fs.readdir('./komutlar/', (err, files) => {
    if (err) console.error(err);
    log(`${files.length} komut yüklenecek.`);
    files.forEach(f => {
        let props = require(`./komutlar/${f}`);
        log(`Yüklenen komut: ${props.help.name}.`);
        client.commands.set(props.help.name, props);
        props.conf.aliases.forEach(alias => {
            client.aliases.set(alias, props.help.name);
        });
    });
});




client.reload = command => {
    return new Promise((resolve, reject) => {
        try {
            delete require.cache[require.resolve(`./komutlar/${command}`)];
            let cmd = require(`./komutlar/${command}`);
            client.commands.delete(command);
            client.aliases.forEach((cmd, alias) => {
                if (cmd === command) client.aliases.delete(alias);
            });
            client.commands.set(command, cmd);
            cmd.conf.aliases.forEach(alias => {
                client.aliases.set(alias, cmd.help.name);
            });
            resolve();
        } catch (e) {
            reject(e);
        }
    });
};

client.load = command => {
    return new Promise((resolve, reject) => {
        try {
            let cmd = require(`./komutlar/${command}`);
            client.commands.set(command, cmd);
            cmd.conf.aliases.forEach(alias => {
                client.aliases.set(alias, cmd.help.name);
            });
            resolve();
        } catch (e) {
            reject(e);
        }
    });
};




client.unload = command => {
    return new Promise((resolve, reject) => {
        try {
            delete require.cache[require.resolve(`./komutlar/${command}`)];
            let cmd = require(`./komutlar/${command}`);
            client.commands.delete(command);
            client.aliases.forEach((cmd, alias) => {
                if (cmd === command) client.aliases.delete(alias);
            });
            resolve();
        } catch (e) {
            reject(e);
        }
    });
};

client.on('message', async msg => {
  if (msg.author.bot) return undefined;
  if (!msg.content.startsWith(prefix)) return undefined;
  const args = msg.content.split(' ');
  const searchString = args.slice(1).join(' ');
  const url = args[1] ? args[1] .replace(/<(.+)>/g, '$1') : '';
  const serverQueue = queue.get(msg.guild.id);
  let command = msg.content.toLowerCase().split(" ")[0];
  command = command.slice(prefix.length)
  if (command === `play`) {
    const voiceChannel = msg.member.voiceChannel;
    if (!voiceChannel) return msg.channel.send('Sesli Kanalda Olmalısınız.');
    const permissions = voiceChannel.permissionsFor(msg.client.user);
    if (!permissions.has('CONNECT')) {
      return msg.channel.send('Bağlanmak için Gerekli İznim Yok.');
    }
    if (!permissions.has('SPEAK')) {
      return msg.channel.send('Konuşmak için Gerekli İznim Yok.');
    }

    if (!permissions.has('EMBED_LINKS')) {
      return msg.channel.sendMessage("Bağlantı yerleştirme yetkim bulunmamakta!")
      }

    if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
      const playlist = await youtube.getPlaylist(url);
      const videos = await playlist.getVideos();
      for (const video of Object.values(videos)) {
        const video2 = await youtube.getVideoByID(video.id);
        await handleVideo(video2, msg, voiceChannel, true);
      }
      return msg.channel.send(` **${playlist.title}** Oynatma Listesine eklendi`);
    } else {
      try {

        var video = await youtube.getVideo(url);

      } catch (error) {
        try {
                          var fast = {};
          var videos = await youtube.searchVideos(searchString, 10);
          let index = 0;
          const embed1 = new Discord.RichEmbed()
              .setDescription(`**1 veya 10 arasında bir sayı giriniz** :
${videos.map(video2 => `[**${++index}**] **${video2.title}**`).join('\n')}`)
          .setFooter(`${msg.guild.name}`)
            .setThumbnail('https://i.postimg.cc/dVJ6q0k0/giphy.gif')
          .setAuthor(`${msg.author.username}`, msg.author.avatarURL)
          .setColor("RED")
          msg.react("▶")
          msg.channel.sendEmbed(embed1).then(message =>{

            message.delete(15000)

          });
          try {
            var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
              maxMatches: 1,
              time: 20000,
              errors: ['time']
            })

            }catch(err) {
            console.error(err);
            return msg.channel.send('Herhangi bir sayı belirtilmedi.!');
            }
          const videoIndex = parseInt(response.first().content);
          var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
        } catch (err) {
          console.error(err);
          return msg.channel.send(':x: Herhangi bir sonuç bulunamadı.');
        }
    }

      return handleVideo(video, msg, voiceChannel);
    }
  } else if (command === `skip`) {
    if (!msg.member.voiceChannel) return msg.channel.send('Sesli kanalda değilsiniz.');
    if (!serverQueue) return msg.channel.send('Bulunamadı');
    serverQueue.connection.dispatcher.end('Güncellendi');
    return undefined;
  } else if (command === `stop`) {
    if (!msg.member.voiceChannel) return msg.channel.send('Sesli kanalda değilsiniz.');
    if (!serverQueue) return msg.channel.send('Bulunamadı');
    serverQueue.songs = [];
    msg.react("🛑")
    serverQueue.connection.dispatcher.end('Güncellendi');
    return undefined;
  } else if (command === `vol`) {
    if (!msg.member.voiceChannel) return msg.channel.send('Sesli kanalda değilsiniz.');
    if (!serverQueue) return msg.channel.send('Bulunamadı');
    if (!args[1]) return msg.channel.send(`:loud_sound: Ses Seviyesi **${serverQueue.volume}**`);
    serverQueue.volume = args[1];
    serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 50);
    return msg.channel.send(`:speaker: Ses Seviyesi Değiştirildi **${args[1]}**`);
  } else if (command === `np`) {
    if (!serverQueue) return msg.channel.send('Bulunamadı');
    const embedNP = new Discord.RichEmbed()
    .setAuthor(`${msg.author.username}`, msg.author.avatarURL)
    .setColor("RED")
  .setDescription(`:notes: Şuanda çalan: **${serverQueue.songs[0].title}**`)
    return msg.channel.sendEmbed(embedNP);
  } else if (command === `replay`) {
    if (!serverQueue) return msg.channel.send('Bulunamadı');
    const embedNP = new Discord.RichEmbed()
    .setAuthor(`${msg.author.username}`, msg.author.avatarURL)
    .setColor("RED")
  .setDescription(`Oynatılacak olan video:**${serverQueue.songs[0].title}**`)
  msg.channel.send({embed: embedNP})
     return handleVideo(video, msg, msg.member.voiceChannel);

  } else if (command === `queue`) {
    if (!serverQueue) return msg.channel.send('Bulunamadı');
    let index = 0;
    const embedqu = new Discord.RichEmbed()
    .setAuthor(`${msg.author.username}`, msg.author.avatarURL)
    .setColor("RED")
.setDescription(`**Şarkı Sırası**
${serverQueue.songs.map(song => `**${++index} -** ${song.title}`).join('\n')}
**Şuanda Çalan** ${serverQueue.songs[0].title}`)
    return msg.channel.sendEmbed(embedqu);
  } else if (command === `pause`) {
    if (serverQueue && serverQueue.playing) {
      serverQueue.playing = false;
      serverQueue.connection.dispatcher.pause();
      return msg.channel.send('Duraklatıldı!');
    }
    return msg.channel.send('Duraklatacağım birşey yok.');
  } else if (command === "resume") {
    if (serverQueue && !serverQueue.playing) {
      serverQueue.playing = true;
      serverQueue.connection.dispatcher.resume();
      return msg.channel.send('Devam ettirildi !');
    }
    return msg.channel.send('Devam ettirebileğim birşey yok.');
  }

  return undefined;
async function handleVideo(video, msg, voiceChannel, playlist = false) {
  const serverQueue = queue.get(msg.guild.id);
  const song = {
    id: video.id,
    title: Util.escapeMarkdown(video.title),
    url: `https://www.youtube.com/watch?v=${video.id}`,
    time:`${video.duration.hours}:${video.duration.minutes}:${video.duration.seconds}`,
    eyad:`${video.thumbnails.high.url}`,
    best:`${video.channel.title}`,
    bees:`${video.raw.snippet.publishedAt}`,
    shahd:`${video.raw.kind}`,
    zg:`${video.raw.snippet.channelId}`,
        views:`${video.raw.views}`,
        like:`${video.raw.likeCount}`,
        dislike:`${video.raw.dislikeCount}`,
        hi:`${video.raw.id}`
  };
  if (!serverQueue) {
    const queueConstruct = {
      textChannel: msg.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };
    queue.set(msg.guild.id, queueConstruct);
    queueConstruct.songs.push(song);
    try {
      var connection = await voiceChannel.join();
      queueConstruct.connection = connection;
      play(msg.guild, queueConstruct.songs[0]);
    } catch (error) {
      console.error(`Ses Kanalına Katılamadım: ${error}`);
      queue.delete(msg.guild.id);
      return msg.channel.send(`Giriş Yapılamadı ${error} \`node-opus\` modülünü yüklemeniz gerekmektedir.`);
    }
  } else {
    serverQueue.songs.push(song);
    console.log(serverQueue.songs);
    if (playlist) return undefined;
    else return msg.channel.send(` **${song.title}** Eklendi!`);
  }
  return undefined;
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
  console.log(serverQueue.songs);
  const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
    .on('end', reason => {
      if (reason === 'Akış Yeterince hızlı değil.') console.log('**Bitiriliyor...**');
      else console.log(reason);
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on('error', error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    fetchVideoInfo(`${song.hi}`, function (err,  idk) {
  if (err) throw new Error(err);
  console.log( idk);
      const yyyy = {}
  if(!yyyy[msg.guild.id]) yyyy[msg.guild.id] = {
    like: `${ idk.likeCount}`,
    dislike: `${ idk.dislikeCount}`
  }
  serverQueue.textChannel.send({embed : new Discord.RichEmbed()
  .setTitle(`**${ idk.title}**`)
  .setURL( idk.url)
  .addField('Video Süresi:' , `${song.time}`, true)
  .addField('Kanal İsmi:' , `${song.best}`, true)
  .addField('Kanal ID:' , `${song.zg}`, true)
  .addField('Video Yüklenme Tarihi:' , `${ idk.datePublished}`, true)
  .addField('Görüntülemeler:' , `${ idk.views}`, true)
  .addField('Beğeniler👍:' , `${ idk.likeCount}`, true)
  .addField('Beğenmeyenler👎:' , `${ idk.dislikeCount}`, true)
  .addField('Yorumlar:' , `${ idk.commentCount}`, true)
  .setImage(`${song.eyad}`)
  .setThumbnail('https://i.postimg.cc/kghbkMWz/ytohbot.gif')
  .setColor('#ff0000')
  .setTimestamp()
  }).then(love => {
    love.react('👍').then(r=>{
    love.react('👎').then(r =>{
    love.react('🙌').then(r=> {
    let likee = (reaction, user) => reaction.emoji.name === '👍' && user.id === msg.author.id;
    let dislikee = (reaction, user) => reaction.emoji.name === '👎' && user.id === msg.author.id;
    let cnn = (reaction, user) => reaction.emoji.name === '🙌' && user.id === msg.author.id;

    let ll = love.createReactionCollector(likee , {max:5});
    let dd = love.createReactionCollector(dislikee , {max:5});
    let cn = love.createReactionCollector(cnn , {max:5});

        ll.on("collect", r => {
          yyyy[msg.guild.id].like++;
  love.edit({embed : new Discord.RichEmbed()
  .setTitle(`**${ idk.title}**`)
  .setURL( idk.url)
  .addField('Video Süresi:' , `${song.time}`, true)
  .addField('Kanal İsmi:' , `${song.best}`, true)
  .addField('Kanal ID:' , `${song.zg}`, true)
  .addField('Video Yüklenme Tarihi:' , `${ idk.datePublished}`, true)
  .addField('Görüntülemeler:' , `${ idk.views}`, true)
  .addField('Beğeniler👍:' , `${yyyy[msg.guild.id].like}`, true)
  .addField('Beğenmeyenler👎:' , `${ idk.dislikeCount}`, true)
  .addField('Yorumlar:' , `${ idk.commentCount}`, true)
  .setImage(`${song.eyad}`)
  .setThumbnail('https://i.postimg.cc/kghbkMWz/ytohbot.gif')
  .setColor('#ff0000')
  .setTimestamp()
});
    })

    dd.on("collect", r => {
      yyyy[msg.guild.id].dislike++;
  love.edit({embed : new Discord.RichEmbed()
  .setTitle(`**${ idk.title}**`)
  .setURL( idk.url)
  .addField('Video Süresi:' , `${song.time}`, true)
  .addField('Kanal İsmi:' , `${song.best}`, true)
  .addField('Kanal ID:' , `${song.zg}`, true)
  .addField('Video Yüklenme Tarihi:' , `${ idk.datePublished}`, true)
  .addField('Görüntülemeler:' , `${ idk.views}`, true)
  .addField('Beğeniler👍:' , `${ idk.likeCount}`, true)
  .addField('Beğenmeyenler👎:' , `${yyyy[msg.guild.id].dislike}`, true)
  .addField('Yorumlar:' , `${ idk.commentCount}`, true)
  .setImage(`${song.eyad}`)
  .setThumbnail('https://i.postimg.cc/kghbkMWz/ytohbot.gif')
  .setColor('#ff0000')
  .setTimestamp()
});
})
    cn.on("collect", r => {
  love.edit({embed : new Discord.RichEmbed()
  .setTitle(`**${ idk.title}**`)
  .setURL( idk.url)
  .addField('Video Süresi:' , `${song.time}`, true)
  .addField('Kanal İsmi:' , `${song.best}`, true)
  .addField('Kanal ID:' , `${song.zg}`, true)
  .addField('Video Yüklenme Tarihi:' , `${ idk.datePublished}`, true)
  .addField('Görüntülemeler:' , `${ idk.views}`, true)
  .addField('Beğeniler👍:' , `${ idk.likeCount}`, true)
  .addField('Beğenmeyenler👎:' , `${ idk.dislikeCount}`, true)
  .addField('Yorumlar:' , `${ idk.commentCount}`, true)
  .setImage(`${song.eyad}`)
  .setThumbnail('https://i.postimg.cc/kghbkMWz/ytohbot.gif')
  .setColor('#ff0000')
  .setTimestamp()
});
})
})
})
})
})
})
}
});

client.elevation = message => {
    if (!message.guild) {
        return;
    }
    let permlvl = 0;
    if (message.member.hasPermission("BAN_MEMBERS")) permlvl = 2;
    if (message.member.hasPermission("ADMINISTRATOR")) permlvl = 3;
    if (message.author.id === ayarlar.sahip) permlvl = 4;
    return permlvl;
};

var regToken = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;
// client.on('debug', e => {
//   console.log(chalk.bgBlue.green(e.replace(regToken, 'that was redacted')));
// });

client.on('warn', e => {
    console.log(chalk.bgYellow(e.replace(regToken, 'that was redacted')));
});

client.on('error', e => {
    console.log(chalk.bgRed(e.replace(regToken, 'that was redacted')));
});

client.login(ayarlar.token);

/*

__   __ _ ______     ______                     _                             _____                         
\ \ / /(_)| ___ \    |  _  \                   | |                           |_   _|                        
 \ V /  _ | |_/ /    | | | |  ___ __   __  ___ | |  ___   _ __    ___  _ __    | |    ___   __ _  _ __ ___  
 /   \ | ||    /     | | | | / _ \\ \ / / / _ \| | / _ \ | '_ \  / _ \| '__|   | |   / _ \ / _` || '_ ` _ \ 
/ /^\ \| || |\ \     | |/ / |  __/ \ V / |  __/| || (_) || |_) ||  __/| |      | |  |  __/| (_| || | | | | |
\/   \/|_|\_| \_|    |___/   \___|  \_/   \___||_| \___/ | .__/  \___||_|      \_/   \___| \__,_||_| |_| |_|
                                                         | |                                                
                                                         |_|                                                

*/
