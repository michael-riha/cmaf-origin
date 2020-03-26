
#### This is a proof of concept of a 
# Origin LIVE-Server for chunked MPEG-Dash, in NodeJS

#### Context

When I assembled [MPEG-Dash CMAF Broadcaster](https://github.com/michael-riha/cmafBroadcaster) I always had the challenge to deliver the chunked MP4 parts as they are written to a HTTP-server directly.

Means:

1) `ffmpeg` (or a Enterprise Encoder such as [Bitmovin-Encoder](https://bitmovin.com/reduced-latency-chunked-cmaf/)) - sends chunked mp4 -> HTTP- PUT or POST -> LIVE-Origin

2) LIVE-Origin saves the chunked CMAF-mp4 as a stream of 
"mdat + moof"- chunks and saves them into a final fragmented-mp4

    during the delivery of those "mdat + moof"-chunkes, before they can be saved as a fully fragmented mp4 -> 3

3) those already delivered chunkes should already be available for the HTTP- GET-request of a Video-Player (such as the [Bitmovin-Video-Player](https://bitmovin.com/video-player/))

**Ad 3) This is exactly the stage, where this POC does it's part.** ;-) 

---

My sources for building a simple webserver that delivers chunked encodings

- [NodeJS-App in a Docker-Container](https://www.digitalocean.com/community/tutorials/how-to-build-a-node-js-application-with-docker)

- [Chunked transfer encoding in NodeJS with Streams](https://stackoverflow.com/questions/6233562/node-js-chunked-transfer-encoding)

---

## Usage:

- clone this repo
- (Install Docker)
- build the Container 

`docker build -t=<LABEL NAME eg. riha/node_origin_cmafserver  .`

- run the Container

`docker run -it -p 5000:5000 -p 5001:5001 -v $PWD/out:/out riha/node_origin_cmafserver`

    - port 5000 & 5001 can be used for either sending the CMAF-chunks and or deliver the chunks. 

    I choose two ports for two processes to deliver and receive the chunks via HTTP separately, to not block both.

    5000 for <- HTTP-PUT/POST writes `request_input.log`

    5001 for ->HTTP-GET writes `response_output.log`
    

    ! You could even run both on the same process but you need to adjust the EOF-timeout because delivery will be much slower sometimes !


    - volume `-v $PWD/out:/out` is the shared folder where the fragmented mp4 as well as the dash-manifest is received as well as deliverd from/to.

- run the container (by entering `bash`)

`docker run -it -p 5000:5000 -p 5001:5001 -v $PWD/out:/out --entrypoint bash riha/node_origin_cmafserver`

-  enter `bash` if server is running

`docker exec -i -t <container id> /bin/bash`

    inside the server you can `tail -f /out/request_input.log` to see the HTTP-PUT OR -POST incoming chunks.

    or you can use `tail -f /out/response_output.log` to see the HTTP-GET outgoing chunks.

- feed the server with a single rendition `ffmpeg`-encoding 

_(in my case `avfoundation` on MacOS)_

```
ffmpeg   -copyts  -probesize 10M -f avfoundation -video_size 1280x720 -framerate 30 -i  '0:1' -flags +global_header   -af aresample=async=1  -c:v:0 libx264 -pix_fmt:0 yuv420p -preset:0 fast -a53cc:0 1 -nal-hrd:0 cbr -x264opts:0 scenecut=-1:rc_lookahead=0 -b:v:0 5000k -bufsize:0 500k -force_key_frames:0 "expr:gte(t,n_forced*2)" -bf:0 8 -c:a:0 aac  -ar 24000 -b:a:1 64k  -f tee -map 0:v -map 0:a "[f=dash:media_seg_name='chunk-stream_93333_\$RepresentationID\$-\$Number%05d\$.mp4':init_seg_name='init-stream_93333_\$RepresentationID\$.mp4':seg_duration=4:utc_timing_url=https\\\://time.akamai.com\\?iso:window_size=3:extra_window_size=3:remove_at_exit=1:use_timeline=0:http_user_agent=ffmpeg_encoder_v4something.0:streaming=1:index_correction=1:timeout=0.5:dash_segment_type=mp4:method=PUT:http_persistent=1:adaptation_sets='id=0,streams=v\:0 id=1,streams=a' ]http://localhost:5000/out.mpd "
```

- open `http://localhost:5001/player`

    - ! replace the path to the stream in the input with `http://localhost:5001/out.mpd` if you use the command above !
    
        or watch the Akamai Test-Stream. 
    
    Enjoy your Encoding with the latest [Bitmovin-Video-Player](https://bitmovin.com/video-player/)

    more info

    https://bitmovin.com/demos/low-latency-streaming

---

## For commercial and Enterprise low latency CMAF-LIVE-Streaming 
### please look at *BITMOVIN* !

https://bitmovin.com/reduced-latency-chunked-cmaf/

<p align="center">
  <a href="https://www.bitmovin.com">
    <img width=60% alt="Bitmovin API SDK Examples Header" src="https://cdn.bitmovin.com/frontend/encoding/openapi-clients/readme-headers/Readme_OpenApi_Header.png" >
  </a>

  <h6 align="center">Repository provides examples demonstrating usage of the <br><a href="https://bitmovin.com/docs/encoding/sdks" target="_blank">Bitmovin API SDKs</a> in different programming languages.</h4>

  <p align="center">
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License"></img></a>
  </p>
</p>

---

### Additional Knowhow that came the way during the process

##### Which OS is used for NodeJs base container?

`cat /etc/*-releaseg`<br>
_inside the container_

##### Watch at all ports on host?

`lsof -nP -i | grep LISTEN`

_listen to port on container_

_[look at a specific tcp-port](https://superuser.com/questions/604998/monitor-tcp-traffic-on-specific-port)_

`tcpdump -i any port 5000`

##### Let us receive some chunked encoding?

https://gist.github.com/PaulMougel/7511372

##### try to send a file with CURL

`curl -i -X PUT -H "Transfer-Encoding: chunked" --data-binary @"$(pwd)/out/anotoher.mp4"  http://localhost:5000/someName.mp4`

#### send it via ffmpeg

```bash
ffmpeg   -copyts  -probesize 10M -f avfoundation -video_size 1280x720 -framerate 30 -i  '0:0' -flags +global_header   -af aresample=async=1  -c:v:0 libx264 -pix_fmt:0 yuv420p -preset:0 fast -a53cc:0 1 -nal-hrd:0 cbr -x264opts:0 scenecut=-1:rc_lookahead=0 -b:v:0 5000k -bufsize:0 500k -force_key_frames:0 "expr:gte(t,n_forced*2)" -bf:0 8  -c:v:1 libx264 -pix_fmt:1 yuv420p -preset:1 fast -a53cc:1 1 -nal-hrd:1 cbr -x264opts:1 scenecut=-1:rc_lookahead=0 -b:v:1 2000k -bufsize:1 200k -s:1 1280x720  -force_key_frames:1 "expr:gte(t,n_forced*2)" -bf:1 8  -c:v:2 libx264 -pix_fmt:2 yuv420p -preset:2 fast -a53cc:2 1 -nal-hrd:2 cbr -x264opts:2 scenecut=-1:rc_lookahead=0 -b:v:2 1000k -bufsize:2 100k -s:2 720x480  -force_key_frames:2 "expr:gte(t,n_forced*2)" -bf:2 8  -c:a:0 aac  -b:a:0 192k  -c:a:1 aac  -ar 24000 -b:a:1 64k  -f tee -map 0:v -map 0:v -map 0:v -map 0:a? -map 0:a? "[f=dash:media_seg_name='chunk-stream_93333_\$RepresentationID\$-\$Number%05d\$.mp4':init_seg_name='init-stream_93333_\$RepresentationID\$.mp4':min_seg_duration=2000000:window_size=3:use_timeline=0:http_user_agent=Akamai_Broadcaster_v1.0:streaming=1:index_correction=1:timeout=0.5:dash_segment_type=mp4:method=PUT:ignore_io_errors=1:http_persistent=1:hls_playlist=1:adaptation_sets='id=0,streams=v\:0v\:1v\:2 id=1,streams=a' ]http://localhost:5000/out.mpd "
```

```bash
ffmpeg   -copyts  -probesize 10M -f avfoundation -video_size 1280x720 -framerate 30 -i  '0:0' -flags +global_header   -af aresample=async=1  -c:v:0 libx264 -pix_fmt:0 yuv420p -preset:0 fast -a53cc:0 1 -nal-hrd:0 cbr -x264opts:0 scenecut=-1:rc_lookahead=0 -b:v:0 5000k -bufsize:0 500k -force_key_frames:0 "expr:gte(t,n_forced*2)" -bf:0 8  -c:v:1 libx264 -pix_fmt:1 yuv420p -preset:1 fast -a53cc:1 1 -nal-hrd:1 cbr -x264opts:1 scenecut=-1:rc_lookahead=0 -b:v:1 2000k -bufsize:1 200k -s:1 1280x720  -force_key_frames:1 "expr:gte(t,n_forced*2)" -bf:1 8  -c:v:2 libx264 -pix_fmt:2 yuv420p -preset:2 fast -a53cc:2 1 -nal-hrd:2 cbr -x264opts:2 scenecut=-1:rc_lookahead=0 -b:v:2 1000k -bufsize:2 100k -s:2 720x480  -force_key_frames:2 "expr:gte(t,n_forced*2)" -bf:2 8  -c:a:0 aac  -b:a:0 192k  -c:a:1 aac  -ar 24000 -b:a:1 64k  -f tee -map 0:v -map 0:v -map 0:v -map 0:a -map 0:a "[f=dash:media_seg_name='chunk-stream_93333_\$RepresentationID\$-\$Number%05d\$.mp4':init_seg_name='init-stream_93333_\$RepresentationID\$.mp4':min_seg_duration=2000000:window_size=3:use_timeline=0:http_user_agent=Akamai_Broadcaster_v1.0:streaming=1:index_correction=1:timeout=0.5:dash_segment_type=mp4:method=PUT:http_persistent=1:hls_playlist=1:adaptation_sets='id=0,streams=v\:0v\:1v\:2 id=1,streams=a' ]http://localhost:5000/out.mpd "
```

```bash
ffmpeg   -copyts  -probesize 10M -f avfoundation -video_size 1280x720 -framerate 30 -i  '0:0' -flags +global_header   -af aresample=async=1  -c:v:0 libx264 -pix_fmt:0 yuv420p -preset:0 fast -a53cc:0 1 -nal-hrd:0 cbr -x264opts:0 scenecut=-1:rc_lookahead=0 -b:v:0 5000k -bufsize:0 500k -force_key_frames:0 "expr:gte(t,n_forced*2)" -bf:0 8  -c:v:1 libx264 -pix_fmt:1 yuv420p -preset:1 fast -a53cc:1 1 -nal-hrd:1 cbr -x264opts:1 scenecut=-1:rc_lookahead=0 -b:v:1 2000k -bufsize:1 200k -s:1 1280x720  -force_key_frames:1 "expr:gte(t,n_forced*2)" -bf:1 8  -c:v:2 libx264 -pix_fmt:2 yuv420p -preset:2 fast -a53cc:2 1 -nal-hrd:2 cbr -x264opts:2 scenecut=-1:rc_lookahead=0 -b:v:2 1000k -bufsize:2 100k -s:2 720x480  -force_key_frames:2 "expr:gte(t,n_forced*2)" -bf:2 8  -c:a:0 aac  -b:a:0 192k  -c:a:1 aac  -ar 24000 -b:a:1 64k  -f tee -map 0:v -map 0:v -map 0:v -map 0:a -map 0:a "[f=dash:media_seg_name='chunk-stream_93333_\$RepresentationID\$-\$Number%05d\$.mp4':init_seg_name='init-stream_93333_\$RepresentationID\$.mp4':min_seg_duration=2000000:window_size=3:extra_window_size=3:remove_at_exit=1:use_timeline=0:http_user_agent=Akamai_Broadcaster_v1.0:streaming=1:index_correction=1:timeout=0.5:dash_segment_type=mp4:method=PUT:http_persistent=1:hls_playlist=1:adaptation_sets='id=0,streams=v\:0v\:1v\:2 id=1,streams=a' ]http://localhost:5000/out.mpd "
```

without HLs and changed `min_seg_duration` (deprecated) 
to `seg_duration` & ldash 

(? https://ffmpeg.org/ffmpeg-formats.html#toc-dash-2)

```bash
ffmpeg   -copyts  -probesize 10M -f avfoundation -video_size 1280x720 -framerate 30 -i  '0:0' -flags +global_header   -af aresample=async=1  -c:v:0 libx264 -pix_fmt:0 yuv420p -preset:0 fast -a53cc:0 1 -nal-hrd:0 cbr -x264opts:0 scenecut=-1:rc_lookahead=0 -b:v:0 5000k -bufsize:0 500k -force_key_frames:0 "expr:gte(t,n_forced*2)" -bf:0 8  -c:v:1 libx264 -pix_fmt:1 yuv420p -preset:1 fast -a53cc:1 1 -nal-hrd:1 cbr -x264opts:1 scenecut=-1:rc_lookahead=0 -b:v:1 2000k -bufsize:1 200k -s:1 1280x720  -force_key_frames:1 "expr:gte(t,n_forced*2)" -bf:1 8  -c:v:2 libx264 -pix_fmt:2 yuv420p -preset:2 fast -a53cc:2 1 -nal-hrd:2 cbr -x264opts:2 scenecut=-1:rc_lookahead=0 -b:v:2 1000k -bufsize:2 100k -s:2 720x480  -force_key_frames:2 "expr:gte(t,n_forced*2)" -bf:2 8  -c:a:0 aac  -b:a:0 192k  -c:a:1 aac  -ar 24000 -b:a:1 64k  -f tee -map 0:v -map 0:v -map 0:v -map 0:a -map 0:a "[f=dash:media_seg_name='chunk-stream_93333_\$RepresentationID\$-\$Number%05d\$.mp4':init_seg_name='init-stream_93333_\$RepresentationID\$.mp4':seg_duration=4:window_size=3:extra_window_size=3:remove_at_exit=1:use_timeline=0:http_user_agent=Akamai_Broadcaster_v1.0:streaming=1:index_correction=1:timeout=0.5:dash_segment_type=mp4:method=PUT:http_persistent=1:adaptation_sets='id=0,streams=v\:0v\:1v\:2 id=1,streams=a' ]http://localhost:5000/out.mpd "
```

just one rendition!

```bash
ffmpeg   -copyts  -probesize 10M -f avfoundation -video_size 1280x720 -framerate 30 -i  '0:0' -flags +global_header   -af aresample=async=1  -c:v:0 libx264 -pix_fmt:0 yuv420p -preset:0 fast -a53cc:0 1 -nal-hrd:0 cbr -x264opts:0 scenecut=-1:rc_lookahead=0 -b:v:0 5000k -bufsize:0 500k -force_key_frames:0 "expr:gte(t,n_forced*2)" -bf:0 8 -c:a:0 aac  -ar 24000 -b:a:1 64k  -f tee -map 0:v -map 0:a "[f=dash:media_seg_name='chunk-stream_93333_\$RepresentationID\$-\$Number%05d\$.mp4':init_seg_name='init-stream_93333_\$RepresentationID\$.mp4':seg_duration=4:utc_timing_url=https://time.akamai.com/?iso:write_prft=1:target_latency=2:window_size=3:extra_window_size=3:remove_at_exit=1:use_timeline=0:http_user_agent=Akamai_Broadcaster_v1.0:streaming=1:index_correction=1:timeout=0.5:dash_segment_type=mp4:method=PUT:http_persistent=1:adaptation_sets='id=0,streams=v\:0 id=1,streams=a' ]http://localhost:5000/out.mpd "
```

On MacOS with microphone added as well!

```
ffmpeg   -copyts  -probesize 10M -f avfoundation -video_size 1280x720 -framerate 30 -i  '0:1' -flags +global_header   -af aresample=async=1  -c:v:0 libx264 -pix_fmt:0 yuv420p -preset:0 fast -a53cc:0 1 -nal-hrd:0 cbr -x264opts:0 scenecut=-1:rc_lookahead=0 -b:v:0 5000k -bufsize:0 500k -force_key_frames:0 "expr:gte(t,n_forced*2)" -bf:0 8 -c:a:0 aac  -ar 24000 -b:a:1 64k  -f tee -map 0:v -map 0:a "[f=dash:media_seg_name='chunk-stream_93333_\$RepresentationID\$-\$Number%05d\$.mp4':init_seg_name='init-stream_93333_\$RepresentationID\$.mp4':seg_duration=4:utc_timing_url=https\\\://time.akamai.com\\?iso:window_size=3:extra_window_size=3:remove_at_exit=1:use_timeline=0:http_user_agent=Akamai_Broadcaster_v1.0:streaming=1:index_correction=1:timeout=0.5:dash_segment_type=mp4:method=PUT:http_persistent=1:adaptation_sets='id=0,streams=v\:0 id=1,streams=a' ]http://localhost:5000/out.mpd "
```