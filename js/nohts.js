MathJax.Hub.Config({
    skipStartupTypeset: true,
    extensions: ["tex2jax.js", "TeX/AMSmath.js"],
    jax: ["input/TeX", "output/SVG"],
    tex2jax: {
        inlineMath: [["$$", "$$"]],
        processEscapes: true
    }
});



// Technique from: https://stackoverflow.com/questions/8672369/how-to-draw-a-line-between-two-divs
function draw_connecting_line(highlight, annotation) {
    CONNECTOR_THICKNESS = 2;
    
    // First, remove any existing connectors (they should be children of the highlighter box)
    if (highlight.children(".connector_line").length > 0) {
        highlight.children(".connector_line").remove();
    }
    
    
    // Anchors set according to relative positions of the highlight and its annotation
    if (
        (annotation.position().top + annotation.height() + 7) > 0
        && annotation.position().top < (highlight.height() + 1)
        && annotation.position().left > (highlight.width() / 2)
    ) {
        var x1 = highlight.width()  + 1;
        var y1 = (highlight.height() / 2);
        var x2 = annotation.position().left + 1;
        var y2 = annotation.position().top + (annotation.height() /2) + 5;
    }
    else if (
        (annotation.position().top + annotation.height() + 7) > 0
        && annotation.position().top < (highlight.height() + 1)
        && (annotation.position().left + annotation.width()) < (highlight.width() / 2)
    ) {
        var x1 = 0;
        var y1 = (highlight.height() / 2);
        var x2 = (annotation.position().left + annotation.width()) + 7;
        var y2 = annotation.position().top + (annotation.height() /2) + 5;
    }
    else if ((annotation.position().top + annotation.height() + 7) < 0) {
        // Annotation above highlight:
        // Top middle of highlight connects to bottom middle of annotation box
        var x1 = (highlight.width() / 2); 
        var y1 = -1; // Looks cleaner at -1 than 0
        var x2 = annotation.position().left + (annotation.width() / 2);
        var y2 = annotation.position().top + annotation.height() + 7; // 7 = padding+border+fudge
    }
    else {
        // Annotation below highlight:
        // Bottom middle of highlight connects to top middle of annotation box
        var x1 = (highlight.width() / 2); 
        var y1 = highlight.height() + 1;
        var x2 = annotation.position().left + (annotation.width() / 2);
        var y2 = annotation.position().top + 1;
    }
    
    
    var length = Math.sqrt(((x2 - x1) * (x2 - x1)) + ((y2 - y1) * (y2 - y1)));
    
    var cx = ((x1 + x2) / 2) - (length / 2);
    var cy = ((y1 + y2) / 2) - (CONNECTOR_THICKNESS / 2);
    
    var angle = Math.atan2((y1 - y2), (x1 - x2)) * (180 / Math.PI);
    
    var line_html = "<div class='connector_line' style='" +
                        "height:" + CONNECTOR_THICKNESS + "px; " +
                        "left:" + cx + "px; " + 
                        "top:" + cy + "px; " +
                        "width:" + length + "px; " +
                        "-moz-transform:rotate(" + angle + "deg); " +
                        "-webkit-transform:rotate(" + angle + "deg); " + 
                        "-o-transform:rotate(" + angle + "deg); " +
                        "-ms-transform:rotate(" + angle + "deg); " +
                        "transform:rotate(" + angle + "deg);' " +
                    "/>";
    
    highlight.append(line_html);
    return true;
}



$( document ).ready(function() {
    note_type = "text";
    close_x_size = 20;
    labeling = false;
    
    
    // Disable normal text select behavior in highlighter pane
    $("#noht_highlighter_pane").attr('unselectable','on')
         .css({'-moz-user-select':    '-moz-none',
               '-moz-user-select':    'none',
               '-o-user-select':      'none',
               '-khtml-user-select':  'none',
               '-webkit-user-select': 'none',
               '-ms-user-select':     'none',
               'user-select':         'none'
         }).bind('selectstart', function() { return false; });
    
    
    // Upon text entry
    $("#noht_input_editor").on("change keyup paste", function() {
        // Update preview pane to match input
        $("#noht_preview_pane").text( $("#noht_input_editor").val() );
        
        // Typeset LaTeX contents, if necessary
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, "noht_preview_pane"]);
    });
    
    
    // First submit: text entry -> highlighter
    $("#advance_to_highlighter").click(function() {
        // Freeze content
        $("#noht_input_pane, #noht_preview_pane, #advance_to_highlighter").hide();
        
        // Enable the correct advancement button
        $("#advance_to_annotator").show();
        
        // Start annotation tool using verified preview pane contents
        $("#noht_highlighter_pane").show().html( $("#noht_preview_pane").html() );
        
        $("#instructions").text("Now draw boxes around each part that you want to explain:")
    });
    
    
    // Second submit: highlighter -> annotator
    $("#advance_to_annotator").click(function() {
        // Freeze the highlighter boxes
        $(".highlight_close_handle").remove();
        
        // Shift submit buttons again
        $("#advance_to_annotator").hide();
        $("#advance_to_finalize").show();
        
        // Reveal the text editor input box
        $("#noht_highlighter_pane").after("<div id='noht_annotation_text_editor'><textarea id='annotation_input' class='form-control' rows='2' placeholder='Enter your annotation here' disabled></textarea></div>")
        
        $("#instructions").text("Click a highlight or annotation box and type an explanation. Click and drag annotation boxes to re-position them:")
        
        // Tell everything else we are ready for liftoff
        labeling = true;
    });
    
    
    // Final submit: annotator -> render and download
    $("#advance_to_finalize").click(function() {
        $(".highlight_box").removeClass('selected_annotation');
        $(".annotation_box").removeClass('selected_annotation');
        
        html2canvas(document.querySelector("#noht_highlighter_pane")).then(canvas => {
            // Create a temporary link with image contents and file name
            downloadLink = document.createElement("a");
            downloadLink.href = canvas.toDataURL().replace(/^data:image\/[^;]+/, 'data:application/octet-stream');
            downloadLink.download = "noht.jpg";
            document.body.appendChild(downloadLink);
            
            // Trigger a click on the link to start the download and then discard it
            downloadLink.click();
            document.body.removeChild(downloadLink);
        });
    });
    
    
    // Highlighter rectangle drawing handler
    $("#noht_highlighter_pane").on("mousedown", function(e) {
        if (!labeling) {
            // If user clicked on a close handle, remove the highlight
            if ( $(e.target).attr('class') == "highlight_close_handle" ) {
                this.dragging = false;
                $(e.target).parent().remove();
            }
            else {
                // Define and add the highlight rectangle
                var click_y    = e.pageY;
                var click_x    = e.pageX;
                
                this.highlight = $('<div>').addClass('highlight_box').css({
                    'left':             click_x,
                    'top':              click_y,
                    'width':            close_x_size,
                    'height':           close_x_size
                });
                
                this.highlight.appendTo( $("#noht_highlighter_pane") );
                this.dragging = true;
                
                
                // Tell the highlight how to behave during annotation
                this.highlight.click(function(e) {
                    if (labeling) {
                        $(".highlight_box").removeClass('selected_annotation');
                        $(".annotation_box").removeClass('selected_annotation');
                        
                        $(e.target).addClass('selected_annotation');
                        
                        if ($(e.target).hasClass("highlight_box")) {
                            $(e.target).children(".annotation_box").addClass('selected_annotation');
                            annotation_target = $(e.target).children(".annotation_box");
                        }
                        if ($(e.target).hasClass("annotation_box")) {
                            $(e.target).parents(".highlight_box").addClass('selected_annotation');
                            annotation_target = $(e.target);
                        }
                        annotation_text = annotation_target.text();
                        
                        // Enable the annotation editor
                        $("#annotation_input").prop('disabled', false);
                        // Populate the editor with existing annotation text
                        $("#annotation_input").val(annotation_text);
                        // Give the editor focus so user can edit without manually clicking the box
                        $("#annotation_input").focus();
                        
                        // Live update text of the annotation as user types
                        $("#annotation_input").on("change keyup paste", function() {
                            annotation_target.text( $("#annotation_input").val() );
                        });
                    }
                })
                
                
                highlighter_pane_vertical_middle = $("#noht_highlighter_pane").position().top +
                                                   70 + // padding + margin + border
                                                   ($("#noht_highlighter_pane").height() / 2) -
                                                   12; // fudge factor
                annotation_buffer = 15;
                
                
                if (this.highlight.position().top > highlighter_pane_vertical_middle) {
                    // If highlight sits below the annotation pane midline, put the annotation below
                    annotation_top = $("#noht_highlighter_pane").position().top +
                                     $("#noht_highlighter_pane").height() -
                                     this.highlight.position().top +
                                     70 + // padding + margin + border
                                     annotation_buffer;
                }
                else {
                    // Otherwise, put it on top
                    annotation_top = $("#noht_highlighter_pane").position().top - this.highlight.position().top + annotation_buffer;
                }
                
                
                this.annotation = $('<div>').addClass('annotation_box').css({
                    // Annotation starts left-aligned to its linked highlight
                    'left': 0,
                    'top':  annotation_top
                });
                
                
                // Annotations can be repositioned, but only during labeling stage
                this.annotation.on("mousedown", function(e) {
                    if (labeling) {
                        this.annotation_dragging = true;
                        this.start_x = e.pageX;
                        this.start_y = e.pageY;
                        this.start_pos = $(e.target).position();
                    }
                }).on("mousemove", function(e) {
                    if (labeling && this.annotation_dragging) {
                        $(e.target).css({
                            'left': this.start_pos.left + e.pageX - this.start_x,
                            'top':  this.start_pos.top + e.pageY - this.start_y,
                        });
                        
                        // Connector line should move with the moving annotation
                        draw_connecting_line($(e.target).parent("div .highlight_box"), $(e.target))
                    }
                }).on("mouseup mouseleave", function(e) {
                    this.annotation_dragging = false;
                });
                
                
                this.highlight.append( this.annotation );
                draw_connecting_line(this.highlight, this.annotation);
            }
        }
    }).on("mousemove", function(e) {
        if (this.dragging && !labeling) {
            var move_x = e.pageX;
            var move_y = e.pageY;
            
            // Use max() to enforce a minimum size for highlight rectangles
            var width  = Math.max(close_x_size, Math.abs(move_x - this.highlight.position().left));
            var height = Math.max(close_x_size, Math.abs(move_y - this.highlight.position().top));
            
            this.highlight.css({
                'width':  width,
                'height': height
            });
            
            draw_connecting_line(this.highlight, this.annotation);
        }
    }).on("mouseup mouseleave", function(e) {
        // Drawing is done, provide a way to remove the highlight
        if (this.dragging && !labeling) {
            close_handle = this.highlight.append("<span class='highlight_close_handle'>X</span>")
            
/*
            // Identify text within the drawn box
            user_text = $("#noht_highlighter_pane").clone().children().remove().end().text();
            orig_html = $("#noht_highlighter_pane").html();
            
            highlighted_text = '';
            for (i = 0; i < user_text.length; i++) {
                // Draw span around each character
                $("#noht_highlighter_pane").html( orig_html.slice(0, i) + '<span id="ruler">' + orig_html.slice(i,i+1) + '</span>' + orig_html.slice(i+1) );
                
                // If coordinates of the span are within the highlighter box, record the character
                pixel_fudge = 4;
                ruler_top  = $("#ruler").offset().top;
                ruler_left = $("#ruler").offset().left;
                hl_top     = parseInt(this.highlight.css('top'))  - pixel_fudge;
                hl_left    = parseInt(this.highlight.css('left')) - pixel_fudge;
                
                if (
                    ruler_top >= hl_top
                    && ruler_top <= (hl_top + this.highlight.height() + pixel_fudge)
                    && ruler_left >= hl_left
                    && ruler_left <= (hl_left + this.highlight.width() + pixel_fudge)
                    && (ruler_top + $("#ruler").height() - pixel_fudge) <= (hl_top + this.highlight.height() + pixel_fudge)
                    && (ruler_left + $("#ruler").width()) <= (hl_left + this.highlight.width() + pixel_fudge)
                ) {
                    highlighted_text += orig_html.slice(i,i+1);
                }
                
                // Put back the original html
                $("#noht_highlighter_pane").html(orig_html)
            }
*/
        }
        this.dragging = false;
    });
});
