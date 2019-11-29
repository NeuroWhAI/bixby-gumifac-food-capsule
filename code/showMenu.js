module.exports.function = function showMenu (store, date, meal, corner) {
  var console = require('console');
  var http = require('http');
  var dates = require('dates');


  var now = dates.ZonedDateTime.now();


  if (!meal) {
    // 현재 시간으로 끼니 자동 선택.
    var hour = now.getHour();
    if (hour < 4) {
      meal = "Dawn";
    }
    else if (hour < 10) {
      meal = "Breakfast";
    }
    else if (hour < 16) {
      meal = "Lunch";
    }
    else if (hour < 20) {
      meal = "Dinner";
    }
    else {
      meal = "Midnight";
    }
  }
  var mealType = mealToType(meal);


  var dayOffset = 0;
  if (meal == "Dawn" && now.getHour() < 4) {
    // 새벽에 묻는 새벽 메뉴는 의도상 어제 메뉴판에 있음.
    dayOffset = -1;
  }


  var targetDate, dateAlias = "";

  if (date && date.date) {
    var d = dates.ZonedDateTime.fromDate(date.date);
    d = d.plusDays(dayOffset);

    targetDate = d.getYear() + "-" + d.getMonth() + "-" + d.getDay();
    dateAlias = date.date.month + "월 " + date.date.day + "일 "; // 보여주는 것은 오프셋 적용 없음.

    var alias = date.date.namedDate;
    if (alias) {
      if (alias == "Today") {
        dateAlias = "오늘 ";
      }
      else if (alias == "Tomorrow") {
        dateAlias = "내일 ";
      }
      else if (alias == "Yesterday") {
        dateAlias = "어제 ";
      }
    }
  }
  else {
    var d = dates.ZonedDateTime.now();
    d = d.plusDays(dayOffset);
    
    targetDate = d.getYear() + "-" + d.getMonth() + "-" + d.getDay();
    dateAlias = "오늘 ";
  }


  var postParams = {
    sDate: targetDate,
    dt: targetDate.replace(/-/gi, ""),
    hallNm: storeToHallName(store),
    oFlag: "R",
    sFlag: "",
    restaurant_code: "",
  };
  var postOptions = {
    format: 'json',
  };
  var response = http.postUrl("http://samsungwelstory.com/menu/sec_gumi/menu/getGumiMenuList.do",
    postParams, postOptions);


  var isTakeout = (corner == "Takeout");

  
  var menuList = filter(response, (menu) => {
    if (isTakeout && menu.sales_type == "L1") {
      return false;
    }
    else if (!isTakeout && menu.sales_type == "L2") {
      return false;
    }

    if (menu.menu_meal_type != mealType) {
      return false;
    }

    return true;
  });

  menuList = group(menuList, 'course_txt');

  menuList = map(menuList, (menuPart) => {
    var mainDishes = filter(menuPart, (menu) => menu.typical_menu == "Y");
    mainDishes = mainDishes.sort((a, b) => parseInt(a.menu_meal_seq) - parseInt(b.menu_meal_seq));
    mainDishes = map(mainDishes, (menu) => menu.menu_name.replace("★프리미엄", "★"));

    var sideDishes = filter(menuPart, (menu) => menu.typical_menu != "Y");
    sideDishes = sideDishes.sort((a, b) => parseInt(a.menu_meal_seq) - parseInt(b.menu_meal_seq));
    sideDishes = map(sideDishes, (menu) => menu.menu_name);

    return {
      corner: menuPart[0].course_txt,
      main: mainDishes,
      side: sideDishes.join(", "),
    };
  });


  var info = storeToName(store) + dateAlias + mealToName(meal) + (isTakeout ? "테이크아웃 " : "") + "메뉴를 찾을 수 없어요.";
  if (menuList.length > 0) {
    info = storeToName(store) + dateAlias + mealToName(meal) + (isTakeout ? "테이크아웃 " : "") + "메뉴에요.";
  }


  return {
    info: info,
    menu: menuList,
  };
}

function storeToHallName(store) {
  if (store == "One") {
    return "2_1campus";
  }
  else if (store == "Two") {
    return "2_2campus";
  }
  else if (store == "Three") {
    return "2_3campus";
  }
  else if (store == "OneCamp") {
    return "1campus";
  }

  return "";
}

function storeToName(store) {
  if (store == "One") {
    return "1식당 ";
  }
  else if (store == "Two") {
    return "2식당 ";
  }
  else if (store == "Three") {
    return "3식당 ";
  }
  else if (store == "OneCamp") {
    return "1캠퍼스 ";
  }

  return "";
}

function mealToType(meal) {
  if (meal == "Breakfast") {
    return "1";
  }
  else if (meal == "Lunch") {
    return "2";
  }
  else if (meal == "Dinner") {
    return "3";
  }
  else if (meal == "Midnight") {
    return "4";
  }
  else {
    return "5";
  }
}

function mealToName(meal) {
  if (meal == "Breakfast") {
    return "아침 ";
  }
  else if (meal == "Lunch") {
    return "점심 ";
  }
  else if (meal == "Dinner") {
    return "저녁 ";
  }
  else if (meal == "Midnight") {
    return "야식 ";
  }
  else if (meal == "Dawn") {
    return "새벽식 ";
  }

  return "";
}

function filter(list, pred) {
  var result = [];
  for (var i=0; i<list.length; ++i) {
    if (pred(list[i])) {
      result.push(list[i]);
    }
  }
  return result;
}

function group(list, key) {
  var result = [];

  var buffer = [];
  for (var i=0; i<list.length; ++i) {
    buffer.push(list[i]);
  }

  for (var i=0; i<buffer.length; ++i) {
    var part = [buffer[i]];
    for (var j=i+1; j<buffer.length; ++j) {
      if (buffer[i][key] === buffer[j][key]) {
        i += 1;
        if (i !== j) {
          var temp = buffer[i];
          buffer[i] = buffer[j];
          buffer[j] = temp;
        }
        part.push(buffer[i]);
      }
    }
    result.push(part);
  }

  return result;
}

function map(list, mapper) {
  var result = [];
  for (var i=0; i<list.length; ++i) {
    result.push(mapper(list[i]));
  }
  return result;
}