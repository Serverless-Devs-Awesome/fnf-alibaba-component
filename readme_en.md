# Preface
  
  
Rapid deployment of Alibaba cloud FNF (serverless workflow) project

# Test

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

# Complete configuration

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

# Parameter details

| Name |  Required  |  Type  |  Description  |
| --- |  ---  |  ---  |  ---  |
| Region | True | Enum | Region |
| Name | True | String | Workflow Name |
| Description | True | String | Workflow Description |
| Type | True | Enum | The type of creation process, value: FDL. |
| Definition | True | String | Definition local dir |
| RoleArn | False | String | Optional parameter, resource descriptor information required for process execution. It is used to perform the assess role of FNF during task execution. |
