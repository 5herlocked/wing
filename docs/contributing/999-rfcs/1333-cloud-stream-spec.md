---
title: "#1333 Cloud Stream Spec"
description: RFC - Cloud.Stream for Streaming Data Services
---

# #1333 - Cloud Stream Spec

- **Author(s):**: @5herlocked
- **Submission Date**: {2023-09-29}
- **Stage**: {Design}
- **Stage Date**: {2023-09-29}

Implementing design and library spec supporting and integrating real-time streaming services.

## Background

Typically streaming data services form an integral backbone of high throughput systems. Specific scenarios where Data Streams are used are:

- Real-time analytics - Analyzing real-time data from sensors, applications, social media etc. to gain instant insights.
- Monitoring - Tracking performance metrics of infrastructure and applications in real-time to identify issues.
- Messaging - High throughput order-agnostic messaging between applications and services.
- ETL - Streaming ETL workflows for real-time data integration.
- Fast Data - Applying complex analytics and machine learning on streaming data for low latency inference.
- User Engagement - Analyzing user actions and behavior as they occur to provide personalized and real-time recommendations.
- IoT - Collecting and processing telemetry streams from IoT devices.
- Gaming - Processing real-time game data streams for features like leaderboards or in-game alerts.
- Financial Services - Performing real-time analytics and complex event processing on financial data feeds.
- E-Commerce - Real-time monitoring of buying behaviour, stock levels, logistics data to enable instant actions.

This is implemented across varied cloud providers, specifically services like: AWS Kinesis Data Streams, Google Cloud Pub/Sub, Azure Event Hubs and in open source solutions like Apache Kafka, Apache Pulsar, etc.

## Design

Traditionally, a device/user writing to a real-time streaming system would simply write to the REST API endpoint exposed by the service. While consumers of the service would consume through polling or fan-out systems from those REST endpoints.

Within wing, these endpoints and their nuance should be abstracted, so writing to or reading from a streaming system is just like writing to or reading from any persistent storage.

For example:

Writing to a data stream from a function should look like:

```ts
bring cloud;

let stream = new cloud.Stream(
  horizon: 48h
) as "TelemetryIngest";


new cloud.Function(inflight (event: IStreamData) => {
  const response = stream.put(event);
}) as "TelemetryWriter";
```

Data from the stream has the following common attributes, and they are stored as a struct within Wing called `StreamData`.

While reading from a stream will look like:

```ts
bring cloud;

let stream = new cloud.Stream(
  horizon: 48h
) as "TelemetryIngest";

let bloc = new cloud.Function(inflight (event: IStreamData)=> {
  let newestBatch = stream.fetch();

  let batchSize = newestBatch.size();
  return batchSize;
}) as "telemetry-reader";
```

Reading from the stream should also be possible through an `onEvent` function which sets up an event trigger to read all
events from the stream:

```ts
bring cloud;

let stream = new cloud.Stream(
  horizon: 48h
) as "TelemetryIngest";

stream.onEvent(inflight (event: IStreamData) => {
  /**
   * data returned by stream has some common information
   * Other data is as the user sets it.
   */
  
  return event.body;
  
}) as "ReadAll";

```

## Requirements

### Functional

- Stream-01 (P0): Create a Streaming Data Endpoint in the cloud of your choice
- Stream-02 (P1): Read, write APIs to transparently expose the underlying endpoint
- Stream-06 (P2): Implicit integration with Stream Aggregration services
- Stream-07 (P2): Experiment with and get feedback about exposing stream shards and partitioning systems

### Non-Functional

- Stream-03 (P2): Deterministic reads from the underlying service
- Stream-04 (P2): Implicit checkpointing system for downstream consumers
- Stream-05 (P1): Batch Reads and Writes for buffering and non-realtime sensitive data

## Implementation

<!--
    This section has a list of topics related to the implementation. We have some examples/ideas for topics below. Feel free to add as needed

    The goal of this section is to help decide if this RFC should be implemented.
    It should include answers to questions that the team is likely ask.
    Contrary to the rest of the RFC, answers should be written "from the present" and likely
    discuss approach, implementation plans, alternative considered and other considerations that will
    help decide if this RFC should be implemented.
-->

### Why are we doing this?

> What is the motivation for this change?
Streaming data services allow real-time processing of continuously generated high-velocity data to enable instant analytics and insights. They provide dynamic scaling, fault tolerance and distributed processing leveraging cheap commodity infrastructure to match the demands of cloud architectures. The cloud-native support, pay-per-use pricing, and integration capabilities make streaming a natural fit for building scalable, reliable and low-latency systems in the cloud.

### What is the technical solution (design) of this feature?

> Briefly describe the high-level design approach for implementing this feature.
>
> As appropriate, you can add an appendix with a more detailed design document.
>
> This is a good place to reference a prototype or proof of concept, which is highly recommended for most RFCs.

### Is this a breaking change?

No. It's a new feature, will not break a pre-existing deployment of wing.

### What is the high-level project plan?

> Describe your plan on how to deliver this feature from prototyping to GA. Especially think about how to "bake" it in the open and get constant feedback from users before you stabilize the APIs.
>
> If you have a project board with your implementation plan, this is a good place to link to it.

### Are there any open issues that need to be addressed later?

> Describe any major open issues that this RFC did not take into account. Once the RFC is approved, create GitHub issues for these issues and update this RFC of the project board with these issue IDs.

The biggest open issue is the strategy for exposing both the data stored within the stream and the metadata surrounding the stream itself. There are two prominent thoughts:

- Implicit management - Wing abstracts away the stored data and only expects an inflight struct to encode on ingest, and decode on egress; while abstracting partitioning, sharding, and scaling nuances.
- Explicit management - Wing directly exposest the partitioning, sharding, and scaling strategies; expects the user know/understand the nuances of streaming systems. This will not include converting the data to stream compatible format (as this will be a provider feature).

## Appendix

Real-time streaming services are often a combination of services that cover the following processes (in order of provider: AWS, GCP, Azure):

- Ingest - Kinesis Data Streams, Pub/Sub, Event Hubs
- Analysis - Kinesis Data Analytics, BigQuery, Stream Analytics
- Delivery - Kinesis Firehose, Cloud Storage, Functions
- Storage - Data Lakes/Lake Formation/S3, Cloud Storage, Blob Storage

### Appendix - Evaluating a "common" API

There are several streaming data systems that provide the streaming data environment. We'll focus on understanding the various functions provided by the services and the platforms, and build a focused "streaming" API.

Cloud Implementations:

- Kinesis
  - [Kinesis Documentation](https://docs.aws.amazon.com/kinesis/latest/APIReference/Welcome.html)
  - no automatic checkpointing outside of AWS Lambda; manual checkpointing with DynamoDb
  - support through Kinesis Firehose to directly store ingested streams into S3
  - get_records, put_record, put_records
- EventHubs
  - [EventHubs Documentation](https://learn.microsoft.com/en-us/rest/api/eventhub/)
  - manual checkpointing with blobs
  - support to automatically store data in Azure Blob storage using EventHubs Capture
  - send_event, send_partition_event, send_batch_events, receive
- Pub/Sub
  - [Pub/Sub Documentation](https://cloud.google.com/pubsub/docs/reference/rest)
  - no need for checkpointing as it's solely a message broker system
  - support to automatically store data in cloud storage through Dataflow
  - create_subscription, pull_messages, seek, ack, create_topic, publish

Other Considerations:

- Redis Streams -
- Kafka -
- DynamoDB Streams -
- MongoDB Atlas -
