# Purpose

The purpose of this function is to build e-learning courses & publish them to Scorm cloud. 

## Dependencies

| Type  | Purpose |
| ------------- | ------------- |
|  [Elearning Data Generator V2](https://github.com/KenticoInternal/ElearningDataGeneratorV2)   | Fetches course data from Kontent & builds json files required by Adapt Framework  |
|  [Kentico Adapt Fork](https://github.com/KenticoInternal/ElearningAdaptV2)   | Builds learning application & publishes it to Scorm Cloud  |

## Configuration

Configuration template can be found in `local.settings.template` file in the root of this repository

| Property  | Purpose | Default value |
| ------------- | ------------- | ------------- |
| `IsDevelopment` | Specifies environment | true |
| `BuildCourseServerUrl` | Url of Data Generator server | http://localhost:51355 |
| `ScormAppId` | Id of Scorm Cloud app  |CDDI0XIXXR |
| `ScormAppSecret` | Secret of Scorm Cloud app | xxx |
| `AdaptGhBranch` | Name of Adapt branch that is used for building course | new-build (will be prod) |
| `AdaptGhUsername` | Name of GitHub user for authentication to Adapt Branch | xxx |
| `AdaptGhToken` | Access token for Github user | xxx |
| `AdaptGhOwner` | Owner of Adapt repository | KenticoInternal |
| `AdaptGhRepository` | Name of the Adapt repository | ElearningAdaptV2 |


## Functions

### BuildAndPublishCourse
This function clones Adapt repository, installs required dependencies, builds course using npm scripts and uploads course to Scorm Cloud.

#### Local testing
To run this function locally start the function and use the following attributes in POSTMAN.
In order for this to work locally the Data Generator (`BuildCourseServerUrl`) has to also be running locally or you have to provide URL for production data generator running on Azure. 

| Test data | Type
| ------------- | ------------- | 
| http://localhost:7071/api/BuildAndPublishCourse | URL
| POST | Request type
| ```{"courseId": "k01","isPreview": false,"scormCloudCourseTitle": "My course","scormCloudCourseId": "m02_dev","projectId": "xxx"}``` | Json data
