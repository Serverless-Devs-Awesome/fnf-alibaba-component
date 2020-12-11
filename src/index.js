/** @format */

const Core = require('@alicloud/pop-core');
const fs = require('fs')
const {Component, Log} = require('@serverless-devs/s-core');

log = new Log()
const defaultOpt = {
    method: 'POST',
    headers: {
        'User-Agent': 'alicloud-serverless-devs'
    }
}


class MyComponent extends Component {
    async getClient(credentials) {
        return new Core({
            accessKeyId: credentials.AccessKeyID,
            accessKeySecret: credentials.AccessKeySecret,
            endpoint: 'https://cn-hangzhou.fnf.aliyuncs.com',
            apiVersion: '2019-03-15'
        })
    }

    async execution_deploy(inputs) {

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} deploy [command]`,
        })

        const client = await this.getClient(inputs.Credentials)

        await this.init()

        log.log("Start deploy workflow ... ")

        const name = inputs.Properties.Name
        const region = inputs.Properties.Region || "cn-hangzhou"
        const definition = inputs.Properties.Definition
        const description = inputs.Properties.Description || "Create By Serverless Devs"
        const type = inputs.Properties.Type || "FDL"

        if (this.state && this.state.RegionId) {
            if (region != this.state.RegionId || name != this.state.Name) {
                // remove
                log.warn(`Try delete workflow ${this.state.Name}`)
                await new Promise((resolve, reject) => {
                    client.request('DeleteFlow', {
                        "RegionId": region,
                        "Name": this.state.Name
                    }, defaultOpt).then((result) => {
                        resolve(result);
                    }, (ex) => {
                        reject(ex)
                    })
                })
                log.warn(`Deleted workflow ${this.state.Name}`)
            }
        }

        let result = {
            RegionId: region,
            Name: name
        }

        const body = {
            "RegionId": region,
            "Name": name,
            "Description": description,
            "Type": type,
            "Definition": fs.readFileSync(definition, 'utf-8')
        }
        if (inputs.Properties.RoleArn) {
            body.RoleArn = inputs.Properties.RoleArn
        }

        try {
            log.log(`Check workflow ${name} ... `)
            await new Promise((resolve, reject) => {
                client.request('DescribeFlow', {
                    "RegionId": region,
                    "Name": name
                }, defaultOpt).then((result) => {
                    resolve(result);
                }, (ex) => {
                    reject(ex)
                })
            })
            log.log(`Update workflow ${name} ... `)
            await new Promise((resolve, reject) => {
                client.request('UpdateFlow', body, defaultOpt).then((result) => {
                    resolve(result);
                }, (ex) => {
                    reject(ex)
                })
            })
        } catch (e) {
            log.log(`Create workflow ${name} ... `)
            if (String(e).includes('does not exist')) {
                await new Promise((resolve, reject) => {
                    client.request('CreateFlow', body, defaultOpt).then((result) => {
                        resolve(result);
                    }, (ex) => {
                        reject(ex)
                    })
                })
            } else {
                throw new Error(e)
            }
        }

        log.log(`Deployed workflow ${name} ... `)

        this.state = result
        await this.save()

        return result
    }

    async execution_remove(inputs) {

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} remove [command]`,
        })

        const client = await this.getClient(inputs.Credentials)

        await this.init()

        log.log("Remove workflow ... ")

        const name = inputs.Properties.Name
        const region = inputs.Properties.Region || "cn-hangzhou"

        await new Promise((resolve, reject) => {
            client.request('DeleteFlow', {
                "RegionId": region,
                "Name": name
            }, defaultOpt).then((result) => {
                resolve(result);
            }, (ex) => {
                reject(ex)
            })
        })

        this.state = {}
        await this.save()

        return {}

    }

    async execution_start(inputs) {

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} execution start [args]`,
            commands: [],
            args: [{
                name: '--execution-name, -en',
                desc: 'User defined execution name. If you need to enter it, please ensure that it is unique under the process.'
            }, {
                name: '--input, -i',
                desc: 'Input information for this execution.'
            }, {
                name: '--input-path, -ip',
                desc: 'Input information path for this execution.'
            }]
        })

        const client = await this.getClient(inputs.Credentials)

        // 将Args转成Object
        const args = this.args(inputs.Args, [], []);
        const executionName = args.Parameters.executionName || args.Parameters.en || undefined
        let inputBody
        const input = args.Parameters.input || args.Parameters.i || undefined
        const inputPath = args.Parameters.inputPath || args.Parameters.ip || undefined
        if (!input && inputPath) {
            inputBody = fs.readFileSync(inputPath, 'utf-8')
        } else if (input) {
            inputBody = input
        } else {
            inputBody = undefined
        }

        const body = {
            "RegionId": inputs.Properties.Region || "cn-hangzhou",
            "FlowName": inputs.Properties.Name
        }

        if (executionName) {
            body.ExecutionName = executionName
        }

        if (inputBody) {
            body.Input = inputBody
        }

        const startExecutionResponse = await new Promise((resolve, reject) => {
            client.request('StartExecution', body, defaultOpt).then((result) => {
                resolve(result);
            }, (ex) => {
                reject(ex)
            })
        })

        return {
            RegionId: inputs.Properties.Region || "cn-hangzhou",
            FlowName: inputs.Properties.Name,
            StartedTime: startExecutionResponse.StartedTime,
            ExecutionName: startExecutionResponse.Name,
        }
    }

    async execution_stop(inputs) {

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} execution start [args]`,
            commands: [],
            args: [{
                name: '--execution-name, -en',
                desc: 'User defined execution name. If you need to enter it, please ensure that it is unique under the process.'
            }, {
                name: '--cause, -c',
                desc: 'Stop the error reason.'
            }, {
                name: '--error, -e',
                desc: 'Stop the error code.'
            }]
        })

        const client = await this.getClient(inputs.Credentials)

        // 将Args转成Object
        const args = this.args(inputs.Args, [], []);
        const executionName = args.Parameters.executionName || args.Parameters.en || undefined
        const cause = args.Parameters.Cause || args.Parameters.c || undefined
        const error = args.Parameters.Error || args.Parameters.e || undefined

        const body = {
            "RegionId": inputs.Properties.Region || "cn-hangzhou",
            "FlowName": inputs.Properties.Name
        }

        if (executionName) {
            body.ExecutionName = executionName
        }

        if (cause) {
            body.Cause = cause
        }

        if (error) {
            body.Error = error
        }

        const stopExecutionResponse = await new Promise((resolve, reject) => {
            client.request('StopExecution', body, defaultOpt).then((result) => {
                resolve(result);
            }, (ex) => {
                reject(ex)
            })
        })
        return {
            RegionId: inputs.Properties.Region || "cn-hangzhou",
            FlowName: inputs.Properties.Name,
            StartedTime: stopExecutionResponse.StartedTime,
            StoppedTime: stopExecutionResponse.StoppedTime,
            ExecutionName: stopExecutionResponse.Name,
            Status: stopExecutionResponse.Status,
            Output: stopExecutionResponse.Output,
        }
    }

    async execution_get(inputs) {

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} execution start [args]`,
            commands: [],
            args: [{
                name: '--execution-name, -en',
                desc: 'User defined execution name. If you need to enter it, please ensure that it is unique under the process.'
            }, {
                name: '--wait, -w',
                desc: 'The longest waiting time of this describexecution request long polling. The legal values are 0 to 60, where waittimeseconds = 0 means that the request immediately returns to the current execution status; if waittimeseconds > 0, the request will be polled in the server for a long time to wait for the execution to finish, and the longest waiting time is seconds for waittimeseconds.'
            }]
        })

        const client = await this.getClient(inputs.Credentials)

        // 将Args转成Object
        const args = this.args(inputs.Args, [], []);
        const executionName = args.Parameters.executionName || args.Parameters.en || undefined
        const waitTimeSeconds = args.Parameters.wait || args.Parameters.w || undefined

        const body = {
            "RegionId": inputs.Properties.Region || "cn-hangzhou",
            "FlowName": inputs.Properties.Name
        }

        if (executionName) {
            body.ExecutionName = executionName
        }

        if (waitTimeSeconds) {
            body.WaitTimeSeconds = waitTimeSeconds
        }

        const descExecutionResponse = await new Promise((resolve, reject) => {
            client.request('DescribeExecution', body, defaultOpt).then((result) => {
                resolve(result);
            }, (ex) => {
                reject(ex)
            })
        })
        return {
            RegionId: inputs.Properties.Region || "cn-hangzhou",
            FlowName: inputs.Properties.Name,
            StartedTime: descExecutionResponse.StartedTime,
            StoppedTime: descExecutionResponse.StoppedTime,
            Status: descExecutionResponse.Status,
            ExecutionName: descExecutionResponse.Name,
            Output: descExecutionResponse.Output,
        }
    }

    async execution_history(inputs) {

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} execution start [args]`,
            commands: [],
            args: [{
                name: '--execution-name, -en',
                desc: 'User defined execution name. If you need to enter it, please ensure that it is unique under the process.'
            }, {
                name: '--limit, -l',
                desc: 'Number of queries.'
            }]
        })

        const client = await this.getClient(inputs.Credentials)

        // 将Args转成Object
        const args = this.args(inputs.Args, [], []);
        const executionName = args.Parameters.executionName || args.Parameters.en || undefined
        const limit = args.Parameters.limit || args.Parameters.l || 200

        const body = {
            "RegionId": inputs.Properties.Region || "cn-hangzhou",
            "FlowName": inputs.Properties.Name
        }

        if (executionName) {
            body.ExecutionName = executionName
        }

        if (limit) {
            body.Limit = limit
        }

        const historyExecutionResponse = await new Promise((resolve, reject) => {
            client.request('GetExecutionHistory', body, defaultOpt).then((result) => {
                resolve(result);
            }, (ex) => {
                reject(ex)
            })
        })

        return {
            RegionId: inputs.Properties.Region || "cn-hangzhou",
            FlowName: inputs.Properties.Name,
            Detail: historyExecutionResponse.Events,
        }
    }

    async execution_list(inputs) {

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} execution start [args]`,
            commands: [],
            args: [{
                name: '--execution-name, -en',
                desc: 'User defined execution name. If you need to enter it, please ensure that it is unique under the process.'
            }, {
                name: '--limit, -l',
                desc: 'Number of queries.'
            }, {
                name: '--filter, -f',
                desc: 'The execution status of the filter you want to filter. The status supports the following fields: Running/Stopped/Succeeded/Failed/TimedOut.'
            }]
        })

        const client = await this.getClient(inputs.Credentials)

        // 将Args转成Object
        const args = this.args(inputs.Args, [], []);
        const executionName = args.Parameters.executionName || args.Parameters.en || undefined
        const limit = args.Parameters.limit || args.Parameters.l || 50
        const filter = args.Parameters.filter || args.Parameters.f || undefined

        const body = {
            "RegionId": inputs.Properties.Region || "cn-hangzhou",
            "FlowName": inputs.Properties.Name
        }

        if (executionName) {
            body.ExecutionName = executionName
        }

        if (limit) {
            body.Limit = limit
        }

        if (filter) {
            body.Status = filter
        }

        const listExecutionResponse = await new Promise((resolve, reject) => {
            client.request('ListExecutions', body, defaultOpt).then((result) => {
                resolve(result);
            }, (ex) => {
                reject(ex)
            })
        })

        const result = []
        for (let i = 0; i < listExecutionResponse.Executions.length; i++) {
            result.push({
                Execution: listExecutionResponse.Executions[i].Name,
                StartedTime: listExecutionResponse.Executions[i].StartedTime,
                StoppedTime: listExecutionResponse.Executions[i].StoppedTime,
                Status: listExecutionResponse.Executions[i].Status,
                Output: listExecutionResponse.Executions[i].Output,
            })
        }

        return {
            RegionId: inputs.Properties.Region || "cn-hangzhou",
            FlowName: inputs.Properties.Name,
            Detail: result,
        }
    }

    async execution(inputs) {
        const args = this.args(inputs.Args, [], []);
        if (args.Commands.length > 0) {
            if (args.Commands[0] == "start") {
                return await this.execution_start(inputs)
            }
            if (args.Commands[0] == "stop") {
                return await this.execution_stop(inputs)
            }
            if (args.Commands[0] == "get") {
                return await this.execution_get(inputs)
            }
            if (args.Commands[0] == "history") {
                return await this.execution_history(inputs)
            }
            if (args.Commands[0] == "list") {
                return await this.execution_list(inputs)
            }
        }

        inputs.Args = "--help"

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} execution [command]`,
            commands: [{
                name: 'list',
                desc: 'Get all historical execution under a process.'
            }, {
                name: 'get',
                desc: 'Get the status of one execution and other information.'
            }, {
                name: 'start',
                desc: 'Start a process execution.'
            }, {
                name: 'stop',
                desc: 'Stop a process executione.'
            }, {
                name: 'history',
                desc: 'Get the details of each step in the execution process.'
            }]
        })
    }

    async schedule_add(inputs) {

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} schedule list [args]`,
            args: [{
                name: '--schedule-mame, -sn',
                desc: 'The name of the scheduled schedule.'
            }, {
                name: '--cron, -c',
                desc: 'Cron expression.'
            }, {
                name: '--description, -d',
                desc: 'Description of timing scheduling.'
            }, {
                name: '--payload, -p',
                desc: 'Trigger messages scheduled for timing must be in JSON format.'
            }, {
                name: '--enable, -e',
                desc: 'Whether scheduled scheduling is enabled.'
            }]
        })

        const client = await this.getClient(inputs.Credentials)

        // 将Args转成Object
        const args = this.args(inputs.Args, [], ['cron', 'scheduleName', 'description', 'payload', 'enable']);
        const cron = args.Parameters.cron || args.Parameters.c || undefined
        const scheduleName = args.Parameters.scheduleName || args.Parameters.sn || undefined
        const description = args.Parameters.description || args.Parameters.d || undefined
        const payload = args.Parameters.payload || args.Parameters.p || undefined
        const enable = args.Parameters.enable || args.Parameters.e || undefined

        const body = {
            "RegionId": inputs.Properties.Region || "cn-hangzhou",
            "FlowName": inputs.Properties.Name
        }

        if (cron) {
            body.CronExpression = cron
        }

        if (scheduleName) {
            body.ScheduleName = scheduleName
        }

        if (description) {
            body.Description = description
        }

        if (payload) {
            body.Payload = JSON.parse(payload)
        }

        if (enable) {
            body.Enable = enable
        }

        const createScheduleResponse = await new Promise((resolve, reject) => {
            client.request('CreateSchedule', body, defaultOpt).then((result) => {
                resolve(result);
            }, (ex) => {
                reject(ex)
            })
        })

        return {
            RegionId: inputs.Properties.Region || "cn-hangzhou",
            FlowName: inputs.Properties.Name,
            ScheduleName: createScheduleResponse.ScheduleName,
            ScheduleId: createScheduleResponse.ScheduleId,
            CronExpression: createScheduleResponse.CronExpression,
            LastModifiedTime: createScheduleResponse.LastModifiedTime,
        }
    }

    async schedule_update(inputs) {

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} schedule list [args]`,
            args: [{
                name: '--schedule-mame, -sn',
                desc: 'The name of the scheduled schedule.'
            }, {
                name: '--cron, -c',
                desc: 'Cron expression.'
            }, {
                name: '--description, -d',
                desc: 'Description of timing scheduling.'
            }, {
                name: '--payload, -p',
                desc: 'Trigger messages scheduled for timing must be in JSON format.'
            }, {
                name: '--enable, -e',
                desc: 'Whether scheduled scheduling is enabled.'
            }]
        })

        const client = await this.getClient(inputs.Credentials)

        // 将Args转成Object
        const args = this.args(inputs.Args, [], ['cron', 'scheduleName', 'description', 'payload', 'enable']);
        const cron = args.Parameters.cron || args.Parameters.c || undefined
        const scheduleName = args.Parameters.scheduleName || args.Parameters.sn || undefined
        const description = args.Parameters.description || args.Parameters.d || undefined
        const payload = args.Parameters.payload || args.Parameters.p || undefined
        const enable = args.Parameters.enable || args.Parameters.e || undefined

        const body = {
            "RegionId": inputs.Properties.Region || "cn-hangzhou",
            "FlowName": inputs.Properties.Name
        }

        if (cron) {
            body.CronExpression = cron
        }

        if (scheduleName) {
            body.ScheduleName = scheduleName
        }

        if (description) {
            body.Description = description
        }

        if (payload) {
            body.Payload = JSON.parse(payload)
        }

        if (enable) {
            body.Enable = enable
        }

        const updateScheduleResponse = await new Promise((resolve, reject) => {
            client.request('UpdateSchedule', body, defaultOpt).then((result) => {
                resolve(result);
            }, (ex) => {
                reject(ex)
            })
        })

        return {
            RegionId: inputs.Properties.Region || "cn-hangzhou",
            FlowName: inputs.Properties.Name,
            ScheduleName: updateScheduleResponse.ScheduleName,
            ScheduleId: updateScheduleResponse.ScheduleId,
            CronExpression: updateScheduleResponse.CronExpression,
            LastModifiedTime: updateScheduleResponse.LastModifiedTime,
        }
    }

    async schedule_list(inputs) {

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} schedule list [args]`,
            args: [{
                name: '--limit, -l',
                desc: 'Limit the number of returns.'
            }]
        })

        const client = await this.getClient(inputs.Credentials)

        // 将Args转成Object
        const args = this.args(inputs.Args, [], []);
        const limit = args.Parameters.limit || args.Parameters.l || 50

        const body = {
            "RegionId": inputs.Properties.Region || "cn-hangzhou",
            "FlowName": inputs.Properties.Name
        }

        if (limit) {
            body.Limit = limit
        }

        const listScheduleResponse = await new Promise((resolve, reject) => {
            client.request('ListSchedules', body, defaultOpt).then((result) => {
                resolve(result);
            }, (ex) => {
                reject(ex)
            })
        })

        return {
            RegionId: inputs.Properties.Region || "cn-hangzhou",
            FlowName: inputs.Properties.Name,
            Scheduled: listScheduleResponse.Schedules
        }
    }

    async schedule_delete(inputs) {

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} schedule delete [args]`,
            args: [{
                name: '--schedule-name, -sn',
                desc: 'The name of the scheduled schedule.'
            }]
        })

        const client = await this.getClient(inputs.Credentials)

        // 将Args转成Object
        const args = this.args(inputs.Args, [], []);
        const scheduleName = args.Parameters.scheduleName || args.Parameters.sn || undefined

        const body = {
            "RegionId": inputs.Properties.Region || "cn-hangzhou",
            "FlowName": inputs.Properties.Name
        }

        if (scheduleName) {
            body.ScheduleName = scheduleName
        }

        await new Promise((resolve, reject) => {
            client.request('DeleteSchedule', body, defaultOpt).then((result) => {
                resolve(result);
            }, (ex) => {
                reject(ex)
            })
        })

        return {
            RegionId: inputs.Properties.Region || "cn-hangzhou",
            FlowName: inputs.Properties.Name,
            ScheduleName: scheduleName
        }
    }

    async schedule_get(inputs) {

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} schedule get [args]`,
            args: [{
                name: '--schedule-name, -sn',
                desc: 'The name of the scheduled schedule.'
            }]
        })

        const client = await this.getClient(inputs.Credentials)

        // 将Args转成Object
        const args = this.args(inputs.Args, [], []);
        const scheduleName = args.Parameters.scheduleName || args.Parameters.sn || undefined

        const body = {
            "RegionId": inputs.Properties.Region || "cn-hangzhou",
            "FlowName": inputs.Properties.Name
        }

        if (scheduleName) {
            body.ScheduleName = scheduleName
        }

        const descResult = await new Promise((resolve, reject) => {
            client.request('DescribeSchedule', body, defaultOpt).then((result) => {
                resolve(result);
            }, (ex) => {
                reject(ex)
            })
        })

        return {
            RegionId: inputs.Properties.Region || "cn-hangzhou",
            FlowName: inputs.Properties.Name,
            CreatedTime: descResult.CreatedTime,
            CronExpression: descResult.CronExpression,
            LastModifiedTime: descResult.LastModifiedTime,
            Enable: descResult.Enable,
            Description: descResult.Description,
        }
    }

    async execution(inputs) {
        const args = this.args(inputs.Args, [], []);
        if (args.Commands.length > 0) {
            if (args.Commands[0] == "add") {
                return await this.schedule_add(inputs)
            }
            if (args.Commands[0] == "update") {
                return await this.schedule_update(inputs)
            }
            if (args.Commands[0] == "list") {
                return await this.schedule_list(inputs)
            }
            if (args.Commands[0] == "delete") {
                return await this.schedule_delete(inputs)
            }
            if (args.Commands[0] == "get") {
                return await this.schedule_get(inputs)
            }
        }

        inputs.Args = "--help"

        this.help(inputs, {
            description: `Usage: s ${inputs.Project.ProjectName} schedule [command]`,
            commands: [{
                name: 'add',
                desc: 'Create a scheduled schedule.'
            }, {
                name: 'update',
                desc: 'Update a scheduled schedule.'
            }, {
                name: 'list',
                desc: 'Get scheduled schedule list.'
            }, {
                name: 'delete',
                desc: 'Delete a scheduled schedule.'
            }, {
                name: 'get',
                desc: 'Get a timing schedule.'
            }]
        })
    }
}

module.exports = MyComponent;
