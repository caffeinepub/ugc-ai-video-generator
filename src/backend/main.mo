import Map "mo:core/Map";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import OutCall "http-outcalls/outcall";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

actor {
  include MixinStorage();

  type MultimediaAsset = {
    id : Text;
    title : Text;
    description : Text;
    blob : Storage.ExternalBlob;
    createdAt : Int;
    uploadedBy : Text;
  };

  type ScriptResult = {
    hook : Text;
    problem : Text;
    solution : Text;
    callToAction : Text;
    fullScript : Text;
    estimatedDuration : Nat;
  };

  type VideoStatus = {
    status : Text;
    videoUrl : Text;
  };

  type JobRecord = {
    id : Text;
    status : Text;
    scriptResult : ?ScriptResult;
    audioUrl : ?Text;
    videoUrl : ?Text;
    errorMessage : ?Text;
    createdAt : Int;
  };

  type ApiKeyStatus = {
    openai : Bool;
    elevenlabs : Bool;
    did : Bool;
  };

  module JobRecord {
    public func compareByCreationTime(a : JobRecord, b : JobRecord) : Order.Order {
      Int.compare(b.createdAt, a.createdAt);
    };
  };

  var openaiApiKey : Text = "YOUR_OPENAI_API_KEY";
  var elevenlabsApiKey : Text = "YOUR_ELEVENLABS_API_KEY";
  var didApiKey : Text = "YOUR_DID_API_KEY";

  let jobs = Map.empty<Text, JobRecord>();
  let assets = Map.empty<Text, MultimediaAsset>();

  // Relay transform to satisfy management canister interface
  public shared query ({ caller }) func transformRelay(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public shared ({ caller }) func setApiKeys(openai : Text, elevenlabs : Text, did : Text) : async () {
    openaiApiKey := openai;
    elevenlabsApiKey := elevenlabs;
    didApiKey := did;
  };

  public query ({ caller }) func getApiKeyStatus() : async ApiKeyStatus {
    {
      openai = openaiApiKey != "YOUR_OPENAI_API_KEY";
      elevenlabs = elevenlabsApiKey != "YOUR_ELEVENLABS_API_KEY";
      did = didApiKey != "YOUR_DID_API_KEY";
    };
  };

  public shared ({ caller }) func generateScript(prompt : Text, tone : Text, voiceType : Text) : async Text {
    if (openaiApiKey == "YOUR_OPENAI_API_KEY") {
      Runtime.trap("Missing OpenAI API key. Please enter your API key in the dashboard.");
    };

    // Construct JSON body for OpenAI
    let body = "{
      \"model\": \"gpt-3.5-turbo\",
      \"messages\": [
        {\"role\": \"system\", \"content\": \"You are a helpful producer that creates engaging video scripts.\"},
        {\"role\": \"user\", \"content\": \"Generate a catchy script for this topic: " # prompt # " with a " # tone # " tone and " # voiceType # " voice.\"}
      ]
    }";

    let extraHeaders = [
      { name = "Content-Type"; value = "application/json" },
      { name = "Authorization"; value = "Bearer " # openaiApiKey },
    ];

    await OutCall.httpPostRequest(
      "https://api.openai.com/v1/chat/completions",
      extraHeaders,
      body,
      transformRelay,
    );
  };

  public shared ({ caller }) func generateVoiceover(script : Text, voiceType : Text) : async Text {
    if (elevenlabsApiKey == "YOUR_ELEVENLABS_API_KEY") {
      Runtime.trap("Missing ElevenLabs API key. Please enter your API key in the dashboard.");
    };

    // Construct JSON body for ElevenLabs
    let body = "{
      \"text\": \"" # script # "\",
      \"voice\": \"" # voiceType # "\"
    }";

    let extraHeaders = [
      { name = "Content-Type"; value = "application/json" },
      { name = "xi-api-key"; value = elevenlabsApiKey },
    ];

    await OutCall.httpPostRequest(
      "https://api.elevenlabs.io/v1/text-to-speech",
      extraHeaders,
      body,
      transformRelay,
    );
  };

  public shared ({ caller }) func startVideoGeneration(imageUrl : Text, audioUrl : Text) : async Text {
    if (didApiKey == "YOUR_DID_API_KEY") {
      Runtime.trap("Missing D-ID API key. Please enter your API key in the dashboard.");
    };

    // Construct JSON body for D-ID
    let body = "{
      \"source_url\": \"" # imageUrl # "\",
      \"script\": {\"audio_url\": \"" # audioUrl # "\"}
    }";

    let extraHeaders = [
      { name = "Content-Type"; value = "application/json" },
      { name = "Authorization"; value = "Basic " # didApiKey },
    ];

    await OutCall.httpPostRequest(
      "https://api.d-id.com/talks",
      extraHeaders,
      body,
      transformRelay,
    );
  };

  public shared ({ caller }) func getVideoStatus(jobId : Text) : async Text {
    if (didApiKey == "YOUR_DID_API_KEY") {
      Runtime.trap("Missing D-ID API key. Please enter your API key in the dashboard.");
    };

    let extraHeaders = [
      { name = "Authorization"; value = "Basic " # didApiKey },
    ];

    await OutCall.httpGetRequest(
      "https://api.d-id.com/talks/" # jobId,
      extraHeaders,
      transformRelay,
    );
  };

  public query ({ caller }) func getJob(jobId : Text) : async ?JobRecord {
    jobs.get(jobId);
  };

  public query ({ caller }) func listJobs() : async [JobRecord] {
    jobs.values().toArray().sort(JobRecord.compareByCreationTime);
  };
};
