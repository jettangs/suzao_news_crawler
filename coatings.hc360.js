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

const url = 'http://info.coatings.hc360.com/list/info_index.shtml'

let list = []

const q = async.queue((item,callback) => {
  
  n.get(item.link, async(err,res,body) => {

    if(err){

      callback()

      return

    }

    console.log("Loaded => " + item.link)

    const $ = cheerio.load(body, { lowerCaseTags: true })

    let cont = $('#artical')

    cont = cont.html()? he.decode(cont.html().replace(/(&nbsp;)+/g, '')).replace(/<(p|div|span|table|a)\s*(\s+[^=]+=\s*"[^"]*")*\s*>/g, '<$1>')
                    .replace(/<(\/)?div>/g, '<$1p>').replace(/　+/g, '').replace(/<\/?(a|span)>/g, '')
                    .replace(/(<p>|<br\/?>)\s+/g, '$1').replace(/<p>\s*(<br\/?>\s*)*<\/p>\s*/g, '') : ''

    item['content'] = cont

    //await News.create(item)

    callback()

  })

})

q.drain = () => {

  sequelize.close()

  console.log('Done.')

}

n.get(url, (err,res,body) => {

  const $ = cheerio.load(body)

  let rows = $('.hot_conc.hot_conc_top,.hot_conc').find('li')

  for(let i = 0; i < rows.length; i++){

    let date = rows.eq(i).find('.pt_date').html().replace(/[\[\]]/g,'').replace(/\//g,'-')

    if(!isToday(new Date(date),new Date())){

      continue

    }

    let item = {}

    let head = rows.eq(i).find('td').eq(0).find('a')

    let title = head.text()

    item['title'] = title? he.decode(title) : ''

    item['link'] = 'http://info.coatings.hc360.com'+head.attr('href')

    item['author'] = 'coatings.hc360'

    item['host'] = 'info.coatings.hc360.com'

    item['cover'] = ''
    
    item['description'] = ''

    //item['create_at'] = date

    list.push(item)

  }
    
  for(let c in list){

    q.push(list[c])

  }

})







