exports.isToday = (d1, d2) => {
  
    let cha = d2.getTime() - d1.getTime()

    return cha < 24 * 60 * 60 * 1000 && cha > 0
    
}

exports.contains = (arr, obj) => { 

    let i = arr.length;  

    while (i--) {  

        if (arr[i].title == obj) { 

            return true;

        }  

    }  

    return false;  

}

exports.today = () => {

    let date = new Date();

    let op1 = "-";

    let op2 = ":";

    let month = date.getMonth() + 1;

    let strDate = date.getDate();

    if (month >= 1 && month <= 9) {

        month = "0" + month;

    }

    if (strDate >= 0 && strDate <= 9) {

        strDate = "0" + strDate;

    }

    let today = date.getFullYear() + op1 + month + op1 + strDate

    return today

}
