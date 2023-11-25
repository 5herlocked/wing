import { Construct } from "constructs";
import { fqnForType } from "../constants";
import { App } from "../core";
import { Json, Node, IInflightHost, Resource, Duration, Struct, MutJson, JsonSchema, IResource } from "../std";
import { FunctionProps } from "./function";

/**
 * Global identifier for `Stream`
 */
export const STREAMS_FQN = fqnForType("cloud.Stream");

/**
 * Options for `Stream`.
 */
export interface StreamProps {
  /**
   * The stream's name
   * @default - a new stream is created with a generated name
   */
  readonly name?: string;

  /**
   * The stream's data horizon.
   * This defines the last of the end of the data that will be kept in the stream
   * Essentially, data younger than the horizon will be kept, everything else dropped
   * @default - 24h
   */
  readonly horizon?: Duration;

  /**
   * The stream's provisioned read capacity
   * This is a complex calculation based on shard amount and capacity per shard
   * @default - 1
   */
  readonly read?: number;

  /**
   * The stream's provisioned write capacity
   * This is a complex calculation based on shard amount and capacity per shard
   * @default - 1
   */
  readonly write?: number;
}

/**
 * A stream.
 * @inflight `@winglang/sdk.cloud.IStreamClient`
 */
export abstract class Stream extends Resource {
  /**
   * Create a new `Stream` Instance
   * @internal
   */
  public static _newStream(
    scope: Construct,
    id: string,
    props: StreamProps = {}
  ): Stream {
    return App.of(scope).newAbstract(STREAMS_FQN, scope, id, props);
  }

  constructor(scope: Construct, id: string, props: StreamProps = {}) {
    super(scope, id);

    Node.of(this).title = "Stream";
    Node.of(this).description =
      "A distributed streaming data ingestion service";

    props;
  }

  /** @internal */
  public abstract _supportedOps(): string[];

  /**
   * Create a function to consume messages from this stream
   */
  public abstract setConsumer(
    handler: IStreamConsumerHandler,
    props?: StreamConsumerOptions
  ): Json;


  /**
   * Convert the incoming data into the stream's ingestion format
   */
  public abstract ingest(data: IStreamData): Json;
}

export interface IStreamData {
  readonly id: string;

  readonly timestamp: EpochTimeStamp;

  readonly data: Json;

  readonly schema: JsonSchema;

  encode(): string;

  decode(data: string): IStreamData;
}

/**
 * Inflight interface for stream
 */
export interface IStreamClient {
  /**
   * Put one or more messages to the queue.
   * @param messages Data to send to the queue. Each message must be non-empty.
   * @inflight
   */
  put(...messages: IStreamData[]): Promise<void>;

  /**
   * Retrive a message from the stream.
   * @returns A single record, or a set of records; or `nil` if the stream is empty.
   * @inflight
   */
  get(): Promise<IStreamData | IStreamData[] | undefined>;

  /**
   * Retrieve the stream's metadata.
   * @inflight
   */
  metadata(): Promise<Struct>;

  /**
   * Retrieve the stream's schema.
   * @inflight
   */
  schema(): Promise<IStreamData>;

  /**
   * Retrieve the stream's configuration.
   * @inflight
   */
  config(): Promise<Json>;
}

export interface IStreamConsumerHandler {
  /**
   * Handle messages.
   * @param data Messages.
   */
  handle(data: IStreamData[]): Promise<void>;
}

/**
 * List of inflight operations for `Stream`.
 * @internal
 */
export enum StreamInflightMethods {
  /** `Stream.put` */
  PUT = "put",
  /** `Stream.get` */
  GET = "get",
}
