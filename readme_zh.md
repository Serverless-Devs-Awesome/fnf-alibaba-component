# 前言

快速部署阿里云 FNF（Serverless Workflow） 项目

# 测试

template.yaml

```
MyFNFDemo:
  Component: fnf
  Provider: alibaba
  Access: release
  Properties:
    Region: cn-hangzhou
    Name: test
    Description: Description
    Definition: ./flow.yaml
```

flow.yaml

```
version: v1beta1
type: flow
steps:
  - type: pass
    name: helloworld

```

# 完整配置

```
MyFNFDemo:
  Component: fnf
  Provider: alibaba
  Properties:
    Region: cn-hangzhou
    Name: test
    Definition: ./temp.json
    Description: by serverless devs
    Type: FDL
    RoleArn: acs:ram:${region}:${accountID}:${role}
```

# 参数详情

| 参数名 |  必填  |  类型  |  参数描述  |
| --- |  ---  |  ---  |  ---  |
| Region | True | Enum | 地域 |
| Name | True | String | Workflow 名字 |
| Description | True | String | Workflow 描述 |
| Type | True | Enum | 创建流程的类型，取值：FDL。 |
| Definition | True | String | Definition 本地路径 |
| RoleArn | False | String | 可选参数，流程执行所需的资源描述符信息，用于在任务执行时 FnF 进行 assume role。 |

