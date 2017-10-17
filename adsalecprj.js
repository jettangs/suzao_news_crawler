const fs = require('fs')

const he = require('he')

const n = require('needle')

const async = require('async')

const cheerio = require('cheerio')

const Sequelize = require('sequelize')

const { db } = require('./config')

const { isToday } = require('./lib')

const sequelize = new Sequelize(`postgres://${db.username}:${db.password}@${db.host}:${db.port}/${db.dbname}`, { logging: false });

const News = sequelize.import('./model')

const url = 'https://www.adsalecprj.com/Publicity/MarketNews/lang-simp/MarketListing.aspx'

let collect = []

const q = async.queue((item, callback) => {

  n.get(item.link, async(err, res, body) => {

    if(err){

      callback()

      return

    }

    console.log("Loaded => " + item.link)

    const $ = cheerio.load(body, { lowerCaseTags: true })

    let cont = $('.articleContentText')

    cont = he.decode(cont.html().replace(/(&nbsp;)+/g, '')).replace(/<(p|div|span|table|a)\s*(\s+[^=]+=\s*"[^"]*")*\s*>/g, '<$1>')
                    .replace(/<(\/)?div>/g, '<$1p>').replace(/　+/g, '').replace(/<\/?(a|span)>/g, '')
                    .replace(/(<p>|<br\/?>)\s+/g, '$1').replace(/<p>\s*(<br\/?>\s*)*<\/p>\s*/g, '')

    item['content'] = cont? cont : ''
    
    await News.create(item)

    callback()

  })
})

q.drain = () => {

    sequelize.close()

    console.log('Done.')

}

n.get(url, (err, res, body) => {

    const $ = cheerio.load(body, { lowerCaseTags: true });

    let rows = $('tbody')

    for (let i = 29; i < 39; i++) {

        let date = rows.eq(i).find('.page_header').find('span').html().replace('.', '-')

        if (!isToday(new Date(date), new Date())) {

            continue

        }

        let item = {}

        let title = rows.eq(i).find('a').find('span').html()

        item['title'] = title ? he.decode(title) : ''

        item['link'] = 'https://www.adsalecprj.com' + rows.eq(i).find('a').attr('href')

        item['author'] = 'adsalecprj'

        item['host'] = 'www.adsalecprj.com'

        item['cover'] = ''
        
        item['description'] = ''

        collect.push(item)
    }

    for (let c in collect) {

        q.push(collect[c])

    }

})