const hapi = require('@hapi/hapi');
let express = require('express');
const AuthBearer = require('hapi-auth-bearer-token');
let fs = require('fs');
let cors = require('cors');

const OnlineAgent = require('./respository/OnlineAgent');

//-------------------------------------

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const apiport = 8443

var url = require('url');

//init Express
var app = express();
//init Express Router
var router = express.Router();
//var port = process.env.PORT || 87;

//REST route for GET /status
router.get('/status', function (req, res) {
    res.json({
        status: 'App is running!'
    });
});

//connect path to router
app.use("/", router);

//----------------------------------------------

const init = async () => {
    //process.setMaxListeners(0);
    require('events').defaultMaxListeners = 0;
    process.setMaxListeners(0);

    var fs = require('fs');
 
    var tls = {
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.crt')
    };

    //const server = Hapi.Server({
    const server = hapi.Server({
        port: apiport,
        host: '0.0.0.0',
        tls: tls,
        //routes: {
        //    cors: true
        //}
        routes: {
            cors: {
                origin: ['*'],
                headers: ["Access-Control-Allow-Headers", "Access-Control-Allow-Origin", "Accept", "Authorization", "Content-Type", "If-None-Match", "Accept-language"],
                additionalHeaders: ["Access-Control-Allow-Headers: Origin, Content-Type, x-ms-request-id , Authorization"],
                credentials: true
            }
        }

    });

    await server.register(require('@hapi/inert'));

    await server.register(AuthBearer);

    server.auth.strategy('simple', 'bearer-access-token', {
        allowQueryToken: true,              // optional, false by default
        validate: async (request, token, h) => {

            // here is where you validate your token
            // comparing with token from your database for example
            const isValid = token === '1aaZ!ARgAQGuQzp00D5D000000.mOv2jmhXkfIsjgywpCIh7.HZpc6vED1LCbc90DTaVDJwdNqbTW5r4uZicv8AFfkOE1ialqnR8UN5.wnAgh090h';

            const credentials = { token };
            const artifacts = { test: 'info' };

            return { isValid, credentials, artifacts };
        }
    });

    server.auth.default('simple');

    //-- Route ------

    server.route({
        method: 'GET',
        path: '/',
        config: {
            cors: {
                origin: [
                    '*'
                ],
                headers: ["Access-Control-Allow-Headers", "Access-Control-Allow-Origin", "Accept", "Authorization", "Content-Type", "If-None-Match", "Accept-language"],
                additionalHeaders: ["Access-Control-Allow-Headers: Origin, Content-Type, x-ms-request-id , Authorization"],
                credentials: true
            }
        },
        handler: async (request, h) => {
            try {
                //console.log('CORS request.info:');
                //console.log(request.info.cors);
                return 'Test Hello, from Endpoint Web Report API.'
            } catch (err) {
                console.dir(err)
            }
        }
    });






    //-------- Code continue here -------------------
    

server.route({
        method: 'GET',
        path: '/api/v1/getOnlineAgentByAgentCode',
        config: {
            cors: {
                origin: [
                    '*'
                ],
                headers: ["Access-Control-Allow-Headers", "Access-Control-Allow-Origin", "Accept", "Authorization", "Content-Type", "If-None-Match", "Accept-language"],
                additionalHeaders: ["Access-Control-Allow-Headers: Origin, Content-Type, x-ms-request-id , Authorization"],
                credentials: true
            }
        },
        handler: async (request, h) => {
            let param = request.query;

            try {

                param.agentcode
                if (param.agentcode == null)
                    return h.response("Please provide agentcode.").code(400);
                else {

                    const responsedata = await OnlineAgent.OnlineAgentRepo.getOnlineAgentByAgentCode(`${param.agentcode}`);

                    if (responsedata.statusCode == 500)
                        return h.response("Something went wrong. Please try again later.").code(500);
                    else
                        if (responsedata.statusCode == 200)
                            return responsedata;
                        else
                            if (responsedata.statusCode == 404)
                                return h.response(responsedata).code(404);
                            else
                                return h.response("Something went wrong. Please try again later.").code(500);

                }
            } catch (err) {
                console.dir(err)
            }
        }

    });


// ------ postOnlineAgentStatus ------------
server.route({
    method: 'POST',
    path: '/api/v1/postOnlineAgentStatus',
    options: {
        cors: {
            origin: ['*'],
            additionalHeaders: ['cache-control', 'x-requested-width']
        },
        payload: {
            parse: true,
            allow: ['application/json', 'multipart/form-data'],
            multipart: true
        }
    },
    handler: async (request, h) => {
        const param = request.payload;
        console.log("----param----", param);

        const { AgentCode, AgentName, IsLogin, AgentStatus } = param;

        try {
            //console.log("------ postOnlineAgentStatus ---------");

            // ตรวจสอบว่า field ทั้งหมดถูกต้อง
            if (!AgentCode || !AgentName || IsLogin === undefined || !AgentStatus) {
                return h.response({
                    error: true,
                    message: "Missing required fields"
                }).code(400);
            }

            const responsedata = await OnlineAgent.OnlineAgentRepo.postOnlineAgentStatus(AgentCode, AgentName, IsLogin, AgentStatus);

            //console.log("------ Response ---------", responsedata.data);

            if (!responsedata.error) {
                if (responsedata.returnCode === 0) { // Insert Agent
                    return {
                        error: false,
                        message: responsedata.data,
                    };
                } else if (responsedata.returnCode === 1) { // Update Agent
                    return {
                        error: false,
                        message: "Agent status has been set.",
                    };
                }
            } else {
                return h.response({
                    error: true,
                    message: "Error!! postOnlineAgentStatus",
                    details: responsedata
                }).code(500);
            }
        } catch (err) {
            console.error("Error in postOnlineAgentStatus:", err);
            return h.response({
                error: true,
                message: "Internal Server Error",
                details: err.message
            }).code(500);
        }
    }
});


  // ------ routes for registration ------------
  server.route({
    method: 'POST',
    path: '/api/v1/register',
    config: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['cache-control', 'x-requested-with']
      },
      payload: {
        parse: true,
        allow: ['application/json'],
        multipart: false // Using JSON for registration
      }
    },
    handler: async (request, h) => {
      const { username, password, email, description } = request.payload;
      
      if (!username || !password || !email) {
        return h.response({ error: 'Username, password, and email are required.' }).code(400);
      }
  
      try {
        const registrationResponse = await OnlineAgent.OnlineAgentRepo.registerUser(username, password, email, description);
        
        if (registrationResponse.error) {
          return h.response({ error: registrationResponse.data }).code(registrationResponse.statusCode);
        } else {
          return h.response({
            data: registrationResponse.data,
            user: registrationResponse.user
          }).code(201);
        }
      } catch (err) {
        console.error('Registration Error: ', err);
        return h.response({ error: 'Internal Server Error' }).code(500);
      }
    }
  });

// ------ routes for login ------------
server.route({
    method: 'POST',
    path: '/api/v1/login',
    config: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['cache-control', 'x-requested-with']
      },
      payload: {
        parse: true,
        allow: ['application/json'],
        multipart: false // Using JSON for login
      }
    },
    handler: async (request, h) => {
      const { username, password } = request.payload;
      
      if (!username || !password) {
        return h.response({ error: 'Username and password are required.' }).code(400);
      }
  
      try {
        const loginResponse = await OnlineAgent.OnlineAgentRepo.validateUserLogin(username, password);
        
        if (loginResponse.error) {
          return h.response({ error: loginResponse.data }).code(loginResponse.statusCode);
        } else {
          return h.response({
            data: loginResponse.data,
            user: loginResponse.user
          }).code(200);
        }
      } catch (err) {
        console.error('Login Error: ', err);
        return h.response({ error: 'Internal Server Error' }).code(500);
      }
    }
  });

    //----------------------------------------------

    await server.start();
    console.log('Webreport API Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();
