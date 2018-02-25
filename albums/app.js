// 引入 express formidable body-parser mongodb express-session cookie-parser ejs
var express = require("express");//web 快速开发框架 
var formid = require("formidable");// 用于文件上传的
var body_parser = require("body-parser"); //  用于非文件上传的post请求快速获取提交数据 通过req.body来获取
var mongodb = require("mongodb");//连接并操作数据库模块
var client = mongodb.MongoClient;//数据库初始化步骤1
var mongo_str = "mongodb://localhost:27017/albums";//连接数据库步骤2
var session = require("express-session");// 给req添加了一个session属性，用于让原本存储在cookie中的信息现在可以存储到req.session中了
var fs = require("fs");//文件操作模块
var gm = require("gm");//引入gm模块
// 定义程序
var app = express();
// 应用中间件
app.use(express.static("static"));
app.use(express.static("albums"));
app.use(body_parser.urlencoded({extended:false}));
app.use(session({
  secret:"doihfoidsahfo",
  resave:true,
  saveUninitialized:true
}))
app.set("view engine","ejs");
// 配置主页路由
app.get("/",function(req,res){
  // 从session中获取登录信息
  var hasLogin = req.session.hasLogin;
  // console.log(hasLogin);
  res.render("index",{
    hasLogin:hasLogin,
    username:req.session.username
  })
})
// 注册逻辑
app.post("/regist",function(req,res){
  console.log(req.body) 
  // 获取用户提交过来的数据
  var form = new formid.IncomingForm();
  form.uploadDir = "./uploads";
  // 解析req对象
  // console.log("解析开始");
  form.parse(req,function(err,fields,files){
    // 提示
    // console.log("解析完成")
    // console.log(err,fields,files);
    // 获取fields中的内容
    var username = fields.username;
    var password = fields.password; 
    var id = fields.userid;
    // 开始创建文件夹
    // console.log("开始创建文件夹")
    fs.mkdir("albums/"+username,function(err){
      // 创建结束 
      // console.log("创建结束",err);
      if(err){
        res.send("抱歉，创建用户文件夹失败");
        return;
      }
      // res.send("创建成功");
      fs.mkdir("albums/"+username+"/head_pic",function(err){
        // 创建结束
        if(err){
          res.send("抱歉，创建头像文件夹失败");
          return;
        }
        var pic = files.user_pic;
        // 先要确定用户是否真的传递了图片
        if(!pic.size){
          // 移除上传上来的空文件
          fs.unlink(pic.path,function(){ 
          })
          // 说明用户真的没有传递内容
          // 复制一个默认头像然后传递到用户新创建的head_pic中
          fs.readFile("default/default.png",function(err,data){
            if(err){
              res.send("抱歉，读取默认头像失败");
              return;
            }
            fs.appendFile("albums/"+username+"/head_pic/head_pic.jpg",data,function(err){
              if(err){
                res.send("抱歉，复制头像失败");
                return;
              }
              // 复制头像成功
              // 插入到数据库中
              client.connect(mongo_str,function(err,db){
                if(err){
                  res.send("连接数据库失败");
                  return;
                }
                db.collection("users").insertOne({"id":id,"username":username,"password":password},function(err,data){
                  if(err){
                    db.close();
                    res.send("插入数据库失败");
                    return;
                  }
                  db.close();
                  req.session.hasLogin = true;
                  req.session.username = username;
                  res.render("index",{
                    hasLogin:req.session.hasLogin,
                    username:username
                  })
                })
              })
            })
          })
        }else{
          // 如果进来了说明真的有图片传递 
          console.log("albums/"+username+"/head_pic/head_pic"+pic.name.slice(pic.name.indexOf(".")))
          fs.rename(pic.path,"albums/"+username+"/head_pic/head_pic.jpg",function(err){
            if(err){
              console.log(err);
              res.send("更换文件名称失败");
              return;
            }
             client.connect(mongo_str,function(err,db){
                if(err){ 
                  res.send("连接数据库失败");
                  return;
                }
                db.collection("users").insertOne({"id":id,"username":username,"password":password},function(err,data){
                  if(err){
                    db.close();
                    res.send("插入数据库失败");
                    return;
                  }
                  db.close();
                  req.session.hasLogin = true;
                  req.session.username = username;
                  res.send("sfaodsfho")
                  // res.render("index",{
                  //   hasLogin:req.session.hasLogin,
                  //   username:username
                  // })
                })
              })
          })  
        }
    })
  })
})
})
// 检测用户名逻辑
app.post("/check_name",function(req,res){
  // 获取提交过来的数据
  var check = req.body.check; 
  var search_option = req.body[check];
//前端传递过来的内容 比较特殊，有两项，第一项是要查询的内容，第二项是要查询的内容对应的具体内容
// {
//   check:"username",
//   username:"123"
// }
// {
//   check:"id",
//   id:123
// }
  // 连接数据库 
  client.connect(mongo_str,function(err,db){
    if(err){
      res.send({"errno":1,"data":"连接数据库失败"});
      return;
    }
    // 定义一个对象 用于定义查询条件
    var obj = {};
    // 适配
    obj[check] = search_option;
    // console.log(1,obj); 
    db.collection("users").findOne(obj,function(err,data){
      console.log(err,data);
      if(err){
        res.send({"errno":2,"data":"查询出错"});
        db.close();
        return;
      }
      if(!data){
        res.send({"errno":0,"data":"恭喜，可以使用!"});
      }else{
        res.send({"errno":3,"data":"已经被占用!"});
      }
      db.close();
    }); 
  })
}) 
// 登录逻辑
app.post("/login",function(req,res){
  // console.log(req.body);
  var username = req.body.username;
  var password = req.body.password;
  client.connect(mongo_str,function(err,db){
    if(err){
      res.send("连接数据库失败");
      return;
    }
    var obj = {
      username:username,
      password:password
    }
    db.collection("users").findOne(obj,function(err,data){
      if(err){
        db.close();
        res.send("查询出错");
        return;
      }
      // 说明没内容
      if(!data){
        db.close();
        res.send("用户名密码错误");
        return;
      }else{
        db.close();
        // res.send("用户名密码正确");
        // 往session中添加内容
        console.log(data);
        req.session.hasLogin = true;
        req.session.username = username;
        req.session.userid = data.id;
        res.render("index.ejs",{
          hasLogin:req.session.hasLogin,
          username:req.session.username
        })
        return;
      }
    })
  })
}) 
// 管理相册
app.get("/albums_manage",function(req,res){
  // 查看是否有用户登录  如果没有登录 就提示
  var hasLogin = req.session.hasLogin;
  if(hasLogin){
    // 读取当前用户的文件夹中的所有内容
    fs.readdir("albums/"+req.session.username,function(err,data){
      console.log("albums/"+req.session.username)
      if(err){
        res.send("读取相册失败");
        return;
      }
      for(var i = 0;i<data.length;i++){
        if(data[i]==="head_pic"){
          data.splice(i,1);
          break;
        }
      }
      res.render("manage",{
        hasLogin:hasLogin,
        username:req.session.username,
        data:data
      })
    })
  }else{
    res.send("请登录");
  }
})
// 创建相册
app.get("/create_album",function(req,res){
  // 获取前端传递过来的数据
  var album_name = req.query.album_name;
  console.log(album_name);
  // 确定用户 
  var username = req.session.username;
  // 拼接字符串 该字符串决定了新的相册的位置
  var album_str = "albums/"+username+"/"+album_name;
  fs.mkdir(album_str,function(err){
    if(err){
      res.json({
        errno:1,
        data:err
      })
      return;
    }
    res.json({
      errno:0,
      data:"创建成功"
    })
  })
})
// 删除路由
app.get("/delete_album",function(req,res){
  var fileName = req.query.fileName;
  var username = req.session.username;
  fs.readdir("albums/"+username+"/"+fileName,function(err,data){
    if(err){
      res.json({"errno":1,data:"读取失败"});
      return;
    }
    for(var i = 0 ; i<data.length;i++){
      fs.unlinkSync("albums/"+username+"/"+fileName+"/"+data[i])
    }
    fs.rmdir("albums/"+username+"/"+fileName,function(err){
      if(err){
        res.json({"errno":2,data:"删除失败"});
        return;
      }
      res.json({
        errno:0,
        data:"删除成功"
      })
    })
  })
})
// 查询用户相册内容的路由
app.get("/get_album_pics",function(req,res){
  // 获取用户要查询那个相册的名字
  var album_name = req.query.albumName;
  var username = req.session.username;
  fs.readdir("albums/"+ username +"/"+album_name,function(err,data){
    if(err){
      res.json({
        errno:1,
        data:"读取失败"
      })
      return;
    }
    // 改造返回数据
    for(var i =0;i<data.length;i++){
      data[i] = username +"/"+album_name+"/"+ data[i];
    }
    res.json({
      errno:0,
      data:data
    })
  })
})
// 查询其他用户相册的内容
app.get("/get_other_album_pics",function(req,res){
  // 获取用户要查询那个相册的名字 
  var loginUser = req.session.username;
  var username = req.query.username;
  fs.readdir("albums/"+ username,function(err,data){
    if(err){
      res.json({
        errno:1,
        data:"读取失败"
      })
      return;
    }
    // 改造返回数据 
    res.render("user_album.ejs",{
        hasLogin:req.session.hasLogin,
        username:loginUser,
        data:data,
        user:username
    })
  })
})
// 删除图片的路由
app.get("/delete_img",function(req,res){
  console.log(req.query.fileName)
  // 获取前端传递过来的内容 要删除哪个相册 要删除该相册中的哪个图片
  fs.unlink("albums/"+req.query.fileName,function(err){
    if(err){
      res.json({
        errno:1,
        data:"删除文件失败"
      })
      return;
    }
    res.json({
      errno:0,
      data:"删除文件成功"
    })
  })
})
// 我的相册路由
app.get("/my_albums",function(req,res){
  // 查看是否登录
  if(!req.session.hasLogin){
    res.send("请登录");
  }else{
    // 说明已经登录 
    var username = req.session.username; 
    // 读取当前用户下的所有文件夹
    fs.readdir("albums/"+username,function(err,data){
      if(err){
        res.send("读取失败");
        return;
      }

      res.render("my_albums.ejs",{
        hasLogin:req.session.hasLogin,
        username:username,
        data:data
      })
    })
    
  }
})
// 当点击某个文件夹图片的时候，跳转到固定的页面显示的内容不同
app.get("/my_pic",function(req,res){
  var dic = req.query.dic;
  fs.readdir("albums/"+req.session.username+"/"+dic,function(err,data){
    if(err){
      res.send("读取失败");
      return;
    }
    var data_img = [];
    for(var i =0;i<data.length;i++){
      data_img[i] =req.session.username+"/"+dic+"/"+data[i];
    }
    res.render("pics",{
      username:req.session.username,
      hasLogin:req.session.hasLogin,
      data:data,
      data_img:data_img
    })
  })
})
// 相册上传
app.post("/uploads",function(req,res){
  // 确定提交到哪个相册中
  var album_name =  "";
  var form = new formid.IncomingForm();
  form.parse(req,function(err,fields,files){
    if(err){
      res.send("解析失败");
      return;
    }
    album_name = fields.album_name;
    var name = files.fileName.name;
    fs.rename(files.fileName.path,"albums/"+req.session.username+"/"+album_name+"/"+name,function(err){
      if(err){
        console.log(err);
        res.send("改名失败")
        return;
      }
      // 跳转路由
      res.redirect("/albums_manage");
    })
  }) 
})
// all_albums路由
app.get("/all_albums",function(req,res){
  // 查看是否已经登录 如果登录才能查看所有人相册
  var hasLogin = req.session.hasLogin;
  var username = req.session.username;
  if(!hasLogin){
    res.send("请登录");
  }else{
    // 已经登录
    fs.readdir("albums",function(err,data){
      if(err){
        res.send("读取失败");
        return ;
      }
      res.render("all_albums.ejs",{
        hasLogin:hasLogin,
        username:username,
        data:data
      })
    })
  }
})
// 当用户点击某个其他人员的某个相册的时候
app.get("/user_album_pics",function(req,res){
  var choose_user =req.query.user;
  var choose_album = req.query.pics;
  console.log(choose_user,choose_album)
  fs.readdir("albums/"+choose_user+"/"+choose_album,function(err,data){
    if(err){
      console.log(err);
      res.send("读取失败");
      return;
    }
    res.render("show_user_pic",{
      hasLogin:req.session.hasLogin,
      username:req.session.username,
      user:choose_user,
      album_name:choose_album,
      data:data
    })
  })
})
app.get("/exit",function(req,res){
  // for(var  i in req.session){
  //   console.log(i);
  // }
  req.session.username = "";
  req.session.hasLogin = "";
  req.session.userid = "";
  // res.send("退出");
  res.render("index",{
    hasLogin:"",
    username:""
  })
})
app.get("/cut",function(req,res){
  // 获取登录状态和用户名
  var username = req.session.username;
  var hasLogin = req.session.hasLogin;
  res.render("cut.ejs",{
    hasLogin:hasLogin,
    username:username
  })
})
app.get("/crop",function(req,res){
  // 获得宽高xy
  var x = req.query.x;
  var y = req.query.y;
  var width = req.query.width;
  var height = req.query.height;
  var username = req.session.username;

  gm("albums/"+username+"/head_pic/head_pic.jpg").crop(width,height,x,y).write("albums/"+username+"/head_pic/head_pic.jpg",function(err,data){
    if(err){
      res.send("裁切失败");return;
    }
    res.send("裁切成功");
  })
})
app.listen(3000,function(){
  // 监听完成之后立马输出 监听完成
  console.log("listen on port : 3000");
});