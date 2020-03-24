
build a simple webserver that delivers chunked encodings

https://www.digitalocean.com/community/tutorials/how-to-build-a-node-js-application-with-docker

https://stackoverflow.com/questions/6233562/node-js-chunked-transfer-encoding

`docker build -t=<LABEL NAME eg. riha/node_origin_cmafserver  .`

enter bash

`docker run -it -p 5000:5000 -p 5001:5001 -v $PWD/out:/out --entrypoint bash riha/node_origin_cmafserver`

enter bash if server is running
`docker exec -i -t <container id> /bin/bash`

take a look at all ports on host
`lsof -nP -i | grep LISTEN`

listen to port on container
https://superuser.com/questions/604998/monitor-tcp-traffic-on-specific-port

`tcpdump -i any port 5000`

find out which OS is runnign:
`cat /etc/*-releaseg inside the container`

general usage step 1
`docker run -it -p 52000:5000 riha/node_origin_cmafserver`

mount the output folder to deliver files
`docker run -it --entrypoint bash -p 8090:5000 -v $PWD/out:/out  riha/node_origin_cmafserver`

next let us receive some chunked encoding?

https://gist.github.com/PaulMougel/7511372

try to send a file with CURL

`curl -i -X PUT -H "Transfer-Encoding: chunked" --data-binary @"$(pwd)/out/anotgher.mp4"  http://localhost:5000/someName.mp4`

send it via ffmpeg

```bash
ffmpeg   -copyts  -probesize 10M -f avfoundation -video_size 1280x720 -framerate 30 -i  '0:0' -flags +global_header   -af aresample=async=1  -c:v:0 libx264 -pix_fmt:0 yuv420p -preset:0 fast -a53cc:0 1 -nal-hrd:0 cbr -x264opts:0 scenecut=-1:rc_lookahead=0 -b:v:0 5000k -bufsize:0 500k -force_key_frames:0 "expr:gte(t,n_forced*2)" -bf:0 8  -c:v:1 libx264 -pix_fmt:1 yuv420p -preset:1 fast -a53cc:1 1 -nal-hrd:1 cbr -x264opts:1 scenecut=-1:rc_lookahead=0 -b:v:1 2000k -bufsize:1 200k -s:1 1280x720  -force_key_frames:1 "expr:gte(t,n_forced*2)" -bf:1 8  -c:v:2 libx264 -pix_fmt:2 yuv420p -preset:2 fast -a53cc:2 1 -nal-hrd:2 cbr -x264opts:2 scenecut=-1:rc_lookahead=0 -b:v:2 1000k -bufsize:2 100k -s:2 720x480  -force_key_frames:2 "expr:gte(t,n_forced*2)" -bf:2 8  -c:a:0 aac  -b:a:0 192k  -c:a:1 aac  -ar 24000 -b:a:1 64k  -f tee -map 0:v -map 0:v -map 0:v -map 0:a? -map 0:a? "[f=dash:media_seg_name='chunk-stream_93333_\$RepresentationID\$-\$Number%05d\$.mp4':init_seg_name='init-stream_93333_\$RepresentationID\$.mp4':min_seg_duration=2000000:window_size=3:use_timeline=0:http_user_agent=Akamai_Broadcaster_v1.0:streaming=1:index_correction=1:timeout=0.5:dash_segment_type=mp4:method=PUT:ignore_io_errors=1:http_persistent=1:hls_playlist=1:adaptation_sets='id=0,streams=v\:0v\:1v\:2 id=1,streams=a' ]http://localhost:5000/out.mpd "
```

```bash
ffmpeg   -copyts  -probesize 10M -f avfoundation -video_size 1280x720 -framerate 30 -i  '0:0' -flags +global_header   -af aresample=async=1  -c:v:0 libx264 -pix_fmt:0 yuv420p -preset:0 fast -a53cc:0 1 -nal-hrd:0 cbr -x264opts:0 scenecut=-1:rc_lookahead=0 -b:v:0 5000k -bufsize:0 500k -force_key_frames:0 "expr:gte(t,n_forced*2)" -bf:0 8  -c:v:1 libx264 -pix_fmt:1 yuv420p -preset:1 fast -a53cc:1 1 -nal-hrd:1 cbr -x264opts:1 scenecut=-1:rc_lookahead=0 -b:v:1 2000k -bufsize:1 200k -s:1 1280x720  -force_key_frames:1 "expr:gte(t,n_forced*2)" -bf:1 8  -c:v:2 libx264 -pix_fmt:2 yuv420p -preset:2 fast -a53cc:2 1 -nal-hrd:2 cbr -x264opts:2 scenecut=-1:rc_lookahead=0 -b:v:2 1000k -bufsize:2 100k -s:2 720x480  -force_key_frames:2 "expr:gte(t,n_forced*2)" -bf:2 8  -c:a:0 aac  -b:a:0 192k  -c:a:1 aac  -ar 24000 -b:a:1 64k  -f tee -map 0:v -map 0:v -map 0:v -map 0:a -map 0:a "[f=dash:media_seg_name='chunk-stream_93333_\$RepresentationID\$-\$Number%05d\$.mp4':init_seg_name='init-stream_93333_\$RepresentationID\$.mp4':min_seg_duration=2000000:window_size=3:use_timeline=0:http_user_agent=Akamai_Broadcaster_v1.0:streaming=1:index_correction=1:timeout=0.5:dash_segment_type=mp4:method=PUT:http_persistent=1:hls_playlist=1:adaptation_sets='id=0,streams=v\:0v\:1v\:2 id=1,streams=a' ]http://localhost:5000/out.mpd "
```

```bash
ffmpeg   -copyts  -probesize 10M -f avfoundation -video_size 1280x720 -framerate 30 -i  '0:0' -flags +global_header   -af aresample=async=1  -c:v:0 libx264 -pix_fmt:0 yuv420p -preset:0 fast -a53cc:0 1 -nal-hrd:0 cbr -x264opts:0 scenecut=-1:rc_lookahead=0 -b:v:0 5000k -bufsize:0 500k -force_key_frames:0 "expr:gte(t,n_forced*2)" -bf:0 8  -c:v:1 libx264 -pix_fmt:1 yuv420p -preset:1 fast -a53cc:1 1 -nal-hrd:1 cbr -x264opts:1 scenecut=-1:rc_lookahead=0 -b:v:1 2000k -bufsize:1 200k -s:1 1280x720  -force_key_frames:1 "expr:gte(t,n_forced*2)" -bf:1 8  -c:v:2 libx264 -pix_fmt:2 yuv420p -preset:2 fast -a53cc:2 1 -nal-hrd:2 cbr -x264opts:2 scenecut=-1:rc_lookahead=0 -b:v:2 1000k -bufsize:2 100k -s:2 720x480  -force_key_frames:2 "expr:gte(t,n_forced*2)" -bf:2 8  -c:a:0 aac  -b:a:0 192k  -c:a:1 aac  -ar 24000 -b:a:1 64k  -f tee -map 0:v -map 0:v -map 0:v -map 0:a -map 0:a "[f=dash:media_seg_name='chunk-stream_93333_\$RepresentationID\$-\$Number%05d\$.mp4':init_seg_name='init-stream_93333_\$RepresentationID\$.mp4':min_seg_duration=2000000:window_size=3:extra_window_size=3:remove_at_exit=1:use_timeline=0:http_user_agent=Akamai_Broadcaster_v1.0:streaming=1:index_correction=1:timeout=0.5:dash_segment_type=mp4:method=PUT:http_persistent=1:hls_playlist=1:adaptation_sets='id=0,streams=v\:0v\:1v\:2 id=1,streams=a' ]http://localhost:5000/out.mpd "
```

without HLs and changed `min_seg_duration` (deprecated) to `seg_duration` & ldash (? https://ffmpeg.org/ffmpeg-formats.html#toc-dash-2)

```bash
ffmpeg   -copyts  -probesize 10M -f avfoundation -video_size 1280x720 -framerate 30 -i  '0:0' -flags +global_header   -af aresample=async=1  -c:v:0 libx264 -pix_fmt:0 yuv420p -preset:0 fast -a53cc:0 1 -nal-hrd:0 cbr -x264opts:0 scenecut=-1:rc_lookahead=0 -b:v:0 5000k -bufsize:0 500k -force_key_frames:0 "expr:gte(t,n_forced*2)" -bf:0 8  -c:v:1 libx264 -pix_fmt:1 yuv420p -preset:1 fast -a53cc:1 1 -nal-hrd:1 cbr -x264opts:1 scenecut=-1:rc_lookahead=0 -b:v:1 2000k -bufsize:1 200k -s:1 1280x720  -force_key_frames:1 "expr:gte(t,n_forced*2)" -bf:1 8  -c:v:2 libx264 -pix_fmt:2 yuv420p -preset:2 fast -a53cc:2 1 -nal-hrd:2 cbr -x264opts:2 scenecut=-1:rc_lookahead=0 -b:v:2 1000k -bufsize:2 100k -s:2 720x480  -force_key_frames:2 "expr:gte(t,n_forced*2)" -bf:2 8  -c:a:0 aac  -b:a:0 192k  -c:a:1 aac  -ar 24000 -b:a:1 64k  -f tee -map 0:v -map 0:v -map 0:v -map 0:a -map 0:a "[f=dash:media_seg_name='chunk-stream_93333_\$RepresentationID\$-\$Number%05d\$.mp4':init_seg_name='init-stream_93333_\$RepresentationID\$.mp4':seg_duration=4:window_size=3:extra_window_size=3:remove_at_exit=1:use_timeline=0:http_user_agent=Akamai_Broadcaster_v1.0:streaming=1:index_correction=1:timeout=0.5:dash_segment_type=mp4:method=PUT:http_persistent=1:adaptation_sets='id=0,streams=v\:0v\:1v\:2 id=1,streams=a' ]http://localhost:5000/out.mpd "
```

just one rendition!

```bash
ffmpeg   -copyts  -probesize 10M -f avfoundation -video_size 1280x720 -framerate 30 -i  '0:0' -flags +global_header   -af aresample=async=1  -c:v:0 libx264 -pix_fmt:0 yuv420p -preset:0 fast -a53cc:0 1 -nal-hrd:0 cbr -x264opts:0 scenecut=-1:rc_lookahead=0 -b:v:0 5000k -bufsize:0 500k -force_key_frames:0 "expr:gte(t,n_forced*2)" -bf:0 8 -c:a:0 aac  -ar 24000 -b:a:1 64k  -f tee -map 0:v -map 0:a "[f=dash:media_seg_name='chunk-stream_93333_\$RepresentationID\$-\$Number%05d\$.mp4':init_seg_name='init-stream_93333_\$RepresentationID\$.mp4':seg_duration=4:utc_timing_url=https://time.akamai.com/?iso:write_prft=1:target_latency=2:window_size=3:extra_window_size=3:remove_at_exit=1:use_timeline=0:http_user_agent=Akamai_Broadcaster_v1.0:streaming=1:index_correction=1:timeout=0.5:dash_segment_type=mp4:method=PUT:http_persistent=1:adaptation_sets='id=0,streams=v\:0 id=1,streams=a' ]http://localhost:5000/out.mpd "
```

with microphone added as well!

```
ffmpeg   -copyts  -probesize 10M -f avfoundation -video_size 1280x720 -framerate 30 -i  '0:1' -flags +global_header   -af aresample=async=1  -c:v:0 libx264 -pix_fmt:0 yuv420p -preset:0 fast -a53cc:0 1 -nal-hrd:0 cbr -x264opts:0 scenecut=-1:rc_lookahead=0 -b:v:0 5000k -bufsize:0 500k -force_key_frames:0 "expr:gte(t,n_forced*2)" -bf:0 8 -c:a:0 aac  -ar 24000 -b:a:1 64k  -f tee -map 0:v -map 0:a "[f=dash:media_seg_name='chunk-stream_93333_\$RepresentationID\$-\$Number%05d\$.mp4':init_seg_name='init-stream_93333_\$RepresentationID\$.mp4':seg_duration=4:utc_timing_url=https\\\://time.akamai.com\\?iso:window_size=3:extra_window_size=3:remove_at_exit=1:use_timeline=0:http_user_agent=Akamai_Broadcaster_v1.0:streaming=1:index_correction=1:timeout=0.5:dash_segment_type=mp4:method=PUT:http_persistent=1:adaptation_sets='id=0,streams=v\:0 id=1,streams=a' ]http://localhost:5000/out.mpd "
```