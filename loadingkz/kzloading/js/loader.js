var loader = new Vue(
    {
        el: '#loader',
        data: {
            volume: 0.5,
            maxCharacters: 3,
            maxBackgrounds: 3,
            animationTime: 7000,
            /* Do not touch next parameters ! */
            characterImage: "",
            backgroundImage: "",
            characterClass: "",
            backgroundClass: "",
            showed: true,
            previousRandom: 0,
            previousRandomCharacter: 0,
            random: 0,
            randomCharacter:0,
            audio: null,
            isSoundPlayed: false,
        },
        mounted: function () {
            // Launch music
            this.audio = document.getElementById('introSound');
            this.audio.volume = this.volume;
            var playPromise = this.audio.play();
            var _audio = this.audio;
            if (playPromise !== undefined) {
                playPromise.catch(function(error) {
                    console.log("Audio autoplay was prevented. Waiting for user interaction.");
                    var playOnInteraction = function() {
                        _audio.play();
                        document.removeEventListener('click', playOnInteraction);
                        document.removeEventListener('keydown', playOnInteraction);
                    };
                    document.addEventListener('click', playOnInteraction);
                    document.addEventListener('keydown', playOnInteraction);
                });
            }
            var _this = this;
            _this.randomImages();

            // Generate images every X seconds
            window.setInterval(function () {
                _this.showed= false;
                window.setTimeout(function () {
                    _this.randomImages();
                    _this.showed= true
                }, 2000);
            }, this.animationTime);

        },
        methods: {
            randomImages: function () {
                var rightToLeft = Math.round(Math.random() * 1) == 1 ? true : false;

                while (this.previousRandom == this.random || this.randomCharacter == this.previousRandomCharacter) {
                    this.random = Math.ceil(Math.random() * this.maxBackgrounds - 1 ) + 1;
                    this.randomCharacter = Math.ceil(Math.random() * this.maxCharacters -1 ) + 1;
                }
                // Change images
                this.previousRandom = this.random;
                this.previousRandomCharacter = this.randomCharacter;
                var backgroundUrl = "img/background/" + this.random + ".jpg";
                var characterUrl = "img/characters/" + this.randomCharacter + ".png";

                if(rightToLeft){
                    this.backgroundClass = "rightToLeftBG";
                    this.characterClass = "leftToRight";
                }else{
                    this.backgroundClass = "leftToRightBG";
                    this.characterClass = "rightToLeft";
                }
                this.backgroundImage = backgroundUrl;
                this.characterImage  = characterUrl;
            },
        }
    });