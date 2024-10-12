const sql = require('mssql');
const sqlConfig = require('../sqlConfig')['development'];
const bcrypt = require('bcrypt');

const { v4: uuid } = require('uuid');

console.log("sqlConfig: ", sqlConfig);

async function getOnlineAgentByAgentCode(agentcode) {

    try {
        console.log("agentcode: ", agentcode);

        let pool = await sql.connect(sqlConfig);
        let result = await pool.request().query(`SELECT * FROM [OnlineAgents] WHERE [agent_code] = '${agentcode}'`); //@agentcode
        //let result = await pool.request().query(`SELECT * FROM [OnlineAgents] WHERE [agent_code] LIKE '99%'`); //@agentcode

        console.log("result: ", result);

        if (!result || result.recordsets[0].length === 0) {
            console.log("result: ERROR");
            return ({
                error: true,
                statusCode: 404,
                errMessage: 'Agent not found',
            });

        } else {

            return ({
                error: false,
                statusCode: 200,
                data: result.recordset[0]
            });

        }

    }
    catch (error) {
        console.log(error);
        return ({
             error: true,
             statusCode: 500,
             errMessage: 'An internal server error occurred',
         });
    }
}


async function postOnlineAgentStatus(AgentCode, AgentName, IsLogin, AgentStatus) {

    try {

        let pool = await sql.connect(sqlConfig);
        let request = await pool.request();
        let agentid = 999;

        //console.log("----------------");
        //console.log("AgentCode: " + AgentCode);
        //console.log("AgentName: " + AgentName);
        //console.log("IsLogin: " + IsLogin);
        //console.log("AgentStatus: " + AgentStatus);

        const uniqueId = uuid();

        request.input("agent_id", sql.Int, agentid);
        request.input("agent_code", sql.VarChar(20), AgentCode);
        request.input("uuid", sql.VarChar(50), uniqueId);
        request.input("AgentName", sql.VarChar(20), AgentName);
        request.input("IsLogin", sql.Char(1), IsLogin);
        request.input("AgentStatus", sql.Char(1), AgentStatus);

        //console.dir("--------request---------");
   
        //let result = await pool.request().query(`SELECT * FROM [OnlineAgents] WHERE [agent_code] = '${AgentCode}'`);
        let result = await pool.request()
        .input('AgentCode', sql.VarChar, AgentCode)
        .query('SELECT * FROM [OnlineAgents] WHERE [agent_code] = @AgentCode');


        if (!result || result.recordsets[0].length === 0) {
            //Insert data
            let result2 = await pool.request().query("INSERT INTO [OnlineAgents] (agent_code, AgentName, IsLogin, AgentStatus, uuid) OUTPUT inserted.agent_code, inserted.uuid, inserted.StartOnline VALUES ('" + AgentCode + "','" + AgentName + "','" + IsLogin + "','" + AgentStatus + "','" + uniqueId + "');");
            console.dir(result2.recordset[0]);

            return ({
                error: false,
                returnCode: 0,
                data: 'Agent was inserted, status has been set also',
            });
       
        } else {
            //Update data
            let result2 = await pool.request().query("UPDATE [OnlineAgents] SET [AgentName] = '" + AgentName + "', [IsLogin] = '" + IsLogin + "', [AgentStatus] = '" + AgentStatus + "'  WHERE [agent_code] = '" + AgentCode + "'; ");
            console.dir(result2);
            
            return ({
                error: false,
                returnCode: 1,
                data: 'Agent was updated',
            });

        }


    } catch (error) {
        console.log(error);
        //callBack(error);
    }

}

async function registerUser(username, password, email, description) {
  try {
      let pool = await sql.connect(sqlConfig);

      // ตรวจสอบว่ามีผู้ใช้ที่มีชื่อผู้ใช้นี้อยู่แล้วหรือไม่
      let result = await pool.request().input('username', sql.VarChar, username)
                             .query('SELECT * FROM [Users] WHERE [username] = @username');

      if (result.recordset.length > 0) {
          return {
              error: true,
              statusCode: 400,
              data: {
                message: 'Username already exists.',
                username: username,
                email: email
            }
          };
      }

      // Hash รหัสผ่าน
      const hashedPassword = await bcrypt.hash(password, 10);

      // เพิ่มผู้ใช้ใหม่ลงฐานข้อมูล
      await pool.request()
          .input('username', sql.VarChar, username)
          .input('password', sql.VarChar, hashedPassword)
          .input('email', sql.VarChar, email)
          .input('description', sql.VarChar, description)
          .query('INSERT INTO [Users] (username, password, email, description) VALUES (@username, @password, @email, @description)');

      return {
          error: false,
          statusCode: 201,
          data: {
            message: 'User registered successfully.',
            username: username,
            email: email
        }
      };

  } catch (error) {
      console.log('Registration Error:', error);
      return {
          error: true,
          statusCode: 500,
          data: 'An internal server error occurred.'
      };
  }
}


// OnlineAgent.js
async function getUserByUsername(username) {
  try {
      let pool = await sql.connect(sqlConfig);

      // ดึงผู้ใช้จากฐานข้อมูลตามชื่อผู้ใช้
      const result = await pool.request()
          .input('username', sql.VarChar, username)
          .query('SELECT * FROM [Users] WHERE [username] = @username');

      // ตรวจสอบว่าผลลัพธ์มีข้อมูลหรือไม่
      if (!result || result.recordset.length === 0) {
          return {
              error: true,
              statusCode: 404,
              errdata: 'User not found'
          };
      } else {
          return {
              error: false,
              statusCode: 200,
              data: result.recordset[0]
          };
      }
  } catch (error) {
      console.log(error);
      return {
          error: true,
          statusCode: 500,
          errdata: 'An internal server error occurred'
      };
  }
}


// Function to validate user login
async function validateUserLogin(username, password) {
    try {
        let pool = await sql.connect(sqlConfig);
      // Fetch user by username
      const userResponse = await getUserByUsername(username);
      
      if (userResponse.error || userResponse.statusCode === 404) {
        return ({
          error: true,
          statusCode: 401,
          data: 'Invalid username or password.'
        });
      }
  
      const user = userResponse.data;
      
      // Compare provided password with hashed password
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (isMatch) {
        return ({
          error: false,
          statusCode: 200,
          data: 'Login successful!',
          user: {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            description: user.description
          }
        });
      } else {
        return ({
          error: true,
          statusCode: 401,
          data: 'Invalid username or password.'
        });
      }
    } catch (error) {
      console.log('Login Error:', error);
      return ({
        error: true,
        statusCode: 500,
        data: 'An internal server error occurred.'
      });
    }
  }

  

module.exports.OnlineAgentRepo = {

    getOnlineAgentByAgentCode: getOnlineAgentByAgentCode,
    postOnlineAgentStatus: postOnlineAgentStatus,
    getUserByUsername: getUserByUsername,
    validateUserLogin: validateUserLogin,
    registerUser: registerUser

}

